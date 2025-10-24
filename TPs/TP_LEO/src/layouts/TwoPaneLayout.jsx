export default function TwoPaneLayout({ stage, panel }) {
  return (
    <div className="layout">
      <div className="stage">{stage}</div>
      <aside className="panel">{panel}</aside>
    </div>
  )
}