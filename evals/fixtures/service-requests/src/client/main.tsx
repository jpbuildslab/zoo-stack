import { StrictMode, useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import type { RequestList, ServiceRequest } from "../contract.ts"
import "./style.css"

function scheduledTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(new Date(iso)) + " UTC"
}

function RequestDesk() {
  const [list, setList] = useState<RequestList>()
  const [review, setReview] = useState<ServiceRequest>()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  const [problem, setProblem] = useState("")
  const dialog = useRef<HTMLDialogElement>(null)
  const submitting = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/requests", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(response.status === 401 ? "Select a fixture session to view requests." : "Could not load requests.")
        }
        setList(await response.json() as RequestList)
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setProblem(error.message)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (review && !dialog.current?.open) dialog.current?.showModal()
  }, [review])

  function closeReview() {
    dialog.current?.close()
    setReview(undefined)
    setProblem("")
  }

  async function approve() {
    if (!review || submitting.current) return
    submitting.current = true
    setPending(true)
    setProblem("")
    try {
      const response = await fetch(`/api/requests/${review.id}/approve`, { method: "POST" })
      if (!response.ok) throw new Error("Approval could not be confirmed. Close the review and check the request.")
      const changed = await response.json() as ServiceRequest
      setList((previous) => previous && {
        ...previous,
        requests: previous.requests.map((item) => item.id === changed.id ? changed : item),
      })
      setMessage(`Approved ${changed.title}.`)
      closeReview()
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Approval could not be confirmed.")
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  return (
    <main>
      <header>
        <h1>Service requests</h1>
        {list && <p>Workspace <strong>{list.workspace}</strong></p>}
      </header>
      {message && <p role="status">{message}</p>}
      {problem && !review && <p role="alert">{problem}</p>}
      {!list && !problem && <p role="status">Loading requests…</p>}
      {list && <ul className="requests" aria-label="Requests">
        {list.requests.map((item) => <li key={item.id}>
          <div>
            <h2>{item.title}</h2>
            <p><time dateTime={item.scheduledStart}>{scheduledTime(item.scheduledStart)}</time></p>
            <p className="status">{item.status}</p>
          </div>
          {list.canApprove && item.status === "submitted" &&
            <button type="button" onClick={() => { setProblem(""); setReview(item) }}>Review approval for {item.title}</button>}
        </li>)}
      </ul>}
      <dialog
        ref={dialog}
        aria-labelledby="review-title"
        onCancel={(event) => {
          event.preventDefault()
          if (!submitting.current) closeReview()
        }}
      >
        {review && <>
          <h2 id="review-title">Approve {review.title}?</h2>
          <p><time dateTime={review.scheduledStart}>{scheduledTime(review.scheduledStart)}</time></p>
          {problem && <p role="alert">{problem}</p>}
          <div className="actions">
            <button type="button" onClick={closeReview} disabled={pending}>Cancel</button>
            <button type="button" onClick={() => void approve()} disabled={pending}>
              {pending ? "Approving…" : "Approve request"}
            </button>
          </div>
        </>}
      </dialog>
    </main>
  )
}

const root = document.getElementById("root")
if (!root) throw new Error("The request desk root is missing")
createRoot(root).render(<StrictMode><RequestDesk /></StrictMode>)
