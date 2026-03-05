# Chat Modes

The chat input has a mode selector. User picks one mode per query before submitting.

## Mode 1 — Web Search 🌐

**When to use:** Current events, new topics, anything not in the KB.

**Pipeline:**
```
OrchestratorService.runWebSearch(query, userId)
  → SearchAgent.search(query)
      → Brave Search API (BRAVE_SEARCH_API_KEY set)
      → DuckDuckGo scrape fallback (if key absent)
      → Returns: [{ url, title, snippet }] × 5
  → ReaderAgent.scrape(urls[0..2])
      → Axios GET each URL
      → Cheerio: remove nav/footer/scripts, extract article/main/body text
      → Truncate to 4000 chars per article
  → SummarizerAgent.summarize(articleText, query) × per article
      → OpenRouter: llama-3.3-70b-instruct:free
      → Returns structured bullet summary
  → SynthesizerAgent.synthesize(summaries[], query)
      → OpenRouter: llama-3.3-70b-instruct:free
      → Returns: final answer + sources list
  → SSE stream tokens to frontend
  → Save session + messages to DB
```

**SSE progress steps emitted to frontend:**
1. `{ step: "searching", message: "Searching the web..." }`
2. `{ step: "reading", message: "Reading top results..." }`
3. `{ step: "summarising", message: "Summarising content..." }`
4. `{ step: "done", answer: "...", sources: [...] }`

---

## Mode 2 — KB Search 📚

**When to use:** Revisiting saved research, recall from personal knowledge base.

**Pipeline:**
```
OrchestratorService.runKbSearch(query, userId)
  → EmbeddingsService.embed(query)
      → @xenova/transformers: all-MiniLM-L6-v2
      → Returns: float32[384] vector
  → KbService.semanticSearch(vector, userId, topK=5)
      → sqlite-vec: cosine similarity against kb_items_vec
  → KbService.keywordSearch(query, userId, topK=5)
      → FTS5: BM25 ranking on title + content + summary
  → KbService.hybridRank(semantic, keyword)
      → Reciprocal Rank Fusion (RRF)
      → Returns: top 5 kb_items
  → If 0 results:
      → Emit { step: "no_results", message: "Nothing found in your KB. Try Web Search." }
      → End pipeline
  → SynthesizerAgent.synthesize(kbResults, query)
      → OpenRouter: gemma-2-9b-it:free
      → Returns: answer grounded in KB content
  → SSE stream tokens to frontend
```

**SSE progress steps:**
1. `{ step: "searching_kb", message: "Searching your knowledge base..." }`
2. `{ step: "done", answer: "...", sources: [kb_items] }` or `{ step: "no_results" }`

---

## Mode 3 — Deep Research 🔬

**When to use:** Complex questions needing comprehensive, structured multi-section reports.

**Pipeline:**
```
OrchestratorService.runDeepResearch(query, userId)
  → OpenRouter (deepseek-r1:free): decompose query into 3-5 sub-questions
  → Emit { step: "planning", subQuestions: [...] }
  
  → For each sub-question (parallel Promise.all):
      → SearchAgent.search(subQuestion)
      → ReaderAgent.scrape(top 2 URLs)
      → SummarizerAgent.summarize(content, subQuestion)
      → Emit { step: "progress", completed: N, total: M }
  
  → OrchestratorService: coverage check
      → OpenRouter: "Are there gaps in this research?"
      → If gaps: run 1-2 additional searches
  
  → ReportWriterAgent.writeReport(allSummaries, query)
      → OpenRouter (mistral-7b-instruct:free)
      → Prompt: produce structured markdown report with:
          - Executive summary
          - Section per sub-question
          - Citations inline [1][2]
          - Sources list at end
      → Stream report tokens via SSE
  
  → Save session + messages + sources to DB
```

**SSE progress steps:**
1. `{ step: "planning", message: "Breaking down your question...", subQuestions: [...] }`
2. `{ step: "researching", message: "Researching sub-topic 1 of 4..." }` (repeated)
3. `{ step: "writing", message: "Writing report..." }`
4. `{ step: "done", report: "...(markdown)...", sources: [...] }`

**Frontend rendering:**
- Deep Research answers are rendered as markdown (use `react-markdown`)
- Progress steps shown as a live timeline above the answer

---

## URL Auto-Detection

If the user's input in any mode starts with `http://` or `https://`, the frontend switches to a URL summarize sub-mode:

```
User pastes URL
  → Frontend detects URL pattern
  → Frontend auto-selects Web Search mode + shows "Summarise URL" label
  → Backend: ReaderAgent.scrape(url) → SummarizerAgent.summarize()
  → Response includes: title, bullet summary, key takeaways
  → Save to KB button shown prominently
```

---

## Save to KB

Every assistant response has a "Save to KB" button. On click:

```
POST /kb/save
  Body: { title, content, summary, sourceUrl, tags[] }
  → EmbeddingsService.embed(content)
  → KbService.save(item + embedding, userId)
  → INSERT into kb_items + kb_items_vec
  → Trigger updates kb_items_fts
```
