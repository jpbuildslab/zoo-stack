import { useEffect, useRef, useState } from "react"
import { createRoot } from "react-dom/client"
import "./style.css"

interface RequestDetails {
  id: string
  title: string
  revision: number
  scheduledStart: string
}

interface ScheduleReview {
  reviewId: string
  previousStart: string
  proposedStart: string
}

interface Result {
  operationId: string
  request: RequestDetails
}

const path = "/api/requests/cedar-approved/reschedule"

async function loadRequest(): Promise<RequestDetails> {
  const response = await fetch("/api/requests")
  if (!response.ok) throw new Error("Could not refresh the request.")
  const { requests } = await response.json() as { requests: RequestDetails[] }
  const request = requests.find(({ id }) => id === "cedar-approved")
  if (!request) throw new Error("The approved fixture request is missing.")
  return request
}

function send(action: string, body: object) {
  return fetch(`${path}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function RescheduleDesk() {
  const [request, setRequest] = useState<RequestDetails>()
  const [start, setStart] = useState("")
  const [review, setReview] = useState<ScheduleReview>()
  const [operationKey, setOperationKey] = useState("")
  const [pending, setPending] = useState(false)
  const [unresolved, setUnresolved] = useState(false)
  const [result, setResult] = useState<Result>()
  const [message, setMessage] = useState("")
  const dialog = useRef<HTMLDialogElement>(null)
  const busy = useRef(false)

  useEffect(() => {
    void loadRequest().then(setRequest, (error: Error) => setMessage(error.message))
  }, [])
  useEffect(() => {
    if (review && !dialog.current?.open) dialog.current?.showModal()
  }, [review])

  async function prepare() {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setMessage("")
    try {
      const response = await send("review", { proposedStart: start })
      if (!response.ok) {
        setMessage("Choose a different valid UTC start time.")
        return
      }
      setReview(await response.json() as ScheduleReview)
      setOperationKey(crypto.randomUUID())
    } catch {
      setMessage("Could not open the review. Your time is still here.")
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  async function apply(recover: boolean) {
    if (busy.current || !review) return
    busy.current = true
    setPending(true)
    setMessage("")
    try {
      const response = recover
        ? await fetch(`${path}/operations/${operationKey}`)
        : await send("confirm", { operationKey, reviewId: review.reviewId })
      if (!response.ok) {
        setUnresolved(recover || response.status >= 500)
        setMessage(recover ? "The original outcome is still unavailable." : "The change could not be confirmed.")
        return
      }
      const confirmed = await response.json() as Result
      setResult(confirmed)
      setRequest(confirmed.request)
      setUnresolved(false)
      setReview(undefined)
      dialog.current?.close()
      void loadRequest().then(setRequest, () => setMessage("Confirmed. The request list could not refresh."))
    } catch {
      setUnresolved(true)
      setMessage("The outcome is unresolved. Recover the original result.")
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return <main>
    <h1>Reschedule {request?.title ?? "request"}</h1>
    {request && <p>Current start <time dateTime={request.scheduledStart}>{request.scheduledStart}</time></p>}
    {result && <p role="status">Confirmed {result.request.scheduledStart}. Operation {result.operationId}.</p>}
    {message && !review && <p role="alert">{message}</p>}
    <form onSubmit={(event) => { event.preventDefault(); void prepare() }}>
      <label>New UTC start <input value={start} onChange={(event) => setStart(event.target.value)} /></label>
      <button type="submit" disabled={!request || pending}>Review new time</button>
    </form>
    <dialog ref={dialog} aria-labelledby="reschedule-heading" onCancel={(event) => {
      event.preventDefault()
      if (!pending && !unresolved) {
        setReview(undefined)
        dialog.current?.close()
      }
    }}>
      {review && <>
        <h2 id="reschedule-heading">Review new time for {request?.title}</h2>
        <p>Previous start {review.previousStart}</p>
        <p>Proposed start {review.proposedStart}</p>
        {message && <p role="alert">{message}</p>}
        {unresolved
          ? <button type="button" disabled={pending} onClick={() => void apply(true)}>Recover original result</button>
          : <button type="button" disabled={pending} onClick={() => void apply(false)}>Confirm new time</button>}
      </>}
    </dialog>
  </main>
}

const root = document.getElementById("root")
if (!root) throw new Error("The reference page root is missing")
createRoot(root).render(<RescheduleDesk />)
