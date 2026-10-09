import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, ThumbsUp, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SlideRef } from "@/components/common/States";
import type { FlashcardDeck } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mark = "know" | "review";

export function FlashcardViewer({ deck }: { deck: FlashcardDeck }) {
  const [order, setOrder] = useState(() => deck.cards.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const card = deck.cards[order[pos]];

  const counts = useMemo(() => {
    const v = Object.values(marks);
    return { know: v.filter((m) => m === "know").length, review: v.filter((m) => m === "review").length };
  }, [marks]);

  const go = (d: number) => {
    setFlipped(false);
    setPos((p) => Math.min(Math.max(p + d, 0), order.length - 1));
  };
  const mark = (m: Mark) => {
    setMarks((x) => ({ ...x, [card.id]: m }));
    if (pos < order.length - 1) go(1);
  };
  const shuffle = () => {
    const o = [...order];
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    setOrder(o);
    setPos(0);
    setFlipped(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
          <span>Card {pos + 1} of {order.length}</span>
          <span>{counts.know} know it · {counts.review} to review</span>
        </div>
        <Progress value={((pos + 1) / order.length) * 100} aria-label="Deck progress" />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? "Show front of card" : "Show answer"}
        className="perspective block h-72 w-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-80"
      >
        <div className={cn("preserve-3d relative h-full w-full transition-transform duration-500", flipped && "rotate-y-180")}>
          <Face className="bg-card">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Concept</span>
            <p className="font-display text-3xl font-semibold">{card.front}</p>
            <span className="text-xs text-muted-foreground">Click or press Enter to flip</span>
          </Face>
          <Face className="rotate-y-180 bg-secondary">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Answer</span>
            <p className="text-lg leading-relaxed">{card.back}</p>
            <SlideRef slides={card.sourceSlides} />
          </Face>
        </div>
      </button>
      {marks[card.id] && (
        <p className="text-center text-sm text-muted-foreground">Marked: {marks[card.id] === "know" ? "Know it" : "Review again"}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button variant="outline" size="icon" aria-label="Previous card" disabled={pos === 0} onClick={() => go(-1)}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" aria-label="Next card" disabled={pos === order.length - 1} onClick={() => go(1)}><ChevronRight /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => mark("review")}><Repeat /> Review again</Button>
          <Button onClick={() => mark("know")}><ThumbsUp /> Know it</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={shuffle}><Shuffle /> Shuffle</Button>
          <Button variant="ghost" onClick={() => { setMarks({}); setPos(0); setFlipped(false); }}><RotateCcw /> Reset</Button>
        </div>
      </div>
    </div>
  );
}

function Face({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("backface-hidden absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center shadow-soft", className)}>
      {children}
    </div>
  );
}
