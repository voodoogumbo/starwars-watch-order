import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Star Wars Watch Order</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Open the full experience at the watch order page.
      </p>
      <p style={{ marginTop: 16 }}>
        <Link href="/watch-order">Go to Watch Order →</Link>
      </p>
    </main>
  );
}
