import "./reference.css"

const sample = [
  { title: "Maple Room", time: "09:00", status: "Submitted" },
  { title: "North Hall", time: "10:00", status: "Approved" },
  { title: "Side Office", time: "11:00", status: "Cancelled" },
  { title: "Long gallery adjoining the north entrance and reception desk", time: "14:00", status: "Submitted" },
  { title: "Meeting Room 4", time: "15:00", status: "Approved" },
]

export function QueueReference() {
  return <main className="reference-queue">
    <header>
      <h1>Service requests</h1>
      <p>Workspace <strong>Cedar</strong></p>
    </header>
    <p className="reference-caption">Queue layout preview</p>
    <ul className="requests" aria-label="Sample requests">
      {sample.map(({ title, time, status }) => <li key={title}>
        <h2>{title}</h2>
        <span>{status}</span>
        <time dateTime={`2030-01-12T${time}:00Z`}>Jan 12, {time} UTC</time>
      </li>)}
    </ul>
  </main>
}

export function ReadingReference() {
  return <main className="reference-reading">
    <article aria-labelledby="note-title">
      <header>
        <p>Operations note</p>
        <h1 id="note-title">Reviewing requests at Cedar</h1>
      </header>
      <p>Check the room and scheduled time with the requester before approving a change to the schedule.
        Leave time for the previous group to clear the room.</p>
      <h2>After approval</h2>
      <p>Check the queue for the approved status. If you lose the confirmation, reopen the queue and
        find the original request before taking another action.</p>
      <h2>When to hand off</h2>
      <p>Send requests for a different workspace to that desk. Include the room name and UTC time so
        the receiving coordinator can find the right record.</p>
    </article>
  </main>
}
