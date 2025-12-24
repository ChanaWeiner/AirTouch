
const items = [
  { icon: "✋", text: "Pause" },
  { icon: "✊", text: "Play" },
  { icon: "✌️", text: "Speed" },
  { icon: "👍", text: "+10s" },
  { icon: "👎", text: "-10s" },
  { icon: "🤟", text: "Next" },
  { icon: "☝️", text: "Ask AI" },
];

export default function Legend() {
  return (
    <div className="legend-grid">
      {items.map((item, index) => (
        <div key={index} className="legend-item">
          <span>{item.icon}</span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}