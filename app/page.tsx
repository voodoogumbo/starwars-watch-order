import { watchOrder } from "@/data/watchOrder";
import WatchList from "@/components/WatchList";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main style={{ padding: "clamp(16px, 4vw, 24px)", maxWidth: 1100, margin: "0 auto" }}>
      <a href="#watch-list" className="skip-link">
        Skip to watch list
      </a>

      <header className="page-header">
        <h1 className="page-title">Star Wars — Watch Order</h1>
        <p className="page-subtitle">
          Star Wars Chronological Order Watchlist. Progress is saved locally.
        </p>
      </header>

      <section id="watch-list" style={{ marginTop: 18 }}>
        <WatchList items={watchOrder} />
      </section>
    </main>
  );
}
