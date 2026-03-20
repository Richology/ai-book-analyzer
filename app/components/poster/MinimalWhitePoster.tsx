"use client";

import type { PosterData } from "./types";
import { computeDensity, df, dl, ds } from "./density";

const FONT =
  "-apple-system,'PingFang SC','Helvetica Neue',Arial,sans-serif";

const NUM = ["01", "02", "03"];

export function MinimalWhitePoster({ data }: { data: PosterData }) {
  const { content } = data;
  const d = computeDensity(content);

  return (
    <div
      style={{
        width: 1080,
        minHeight: 1440,
        fontFamily: FONT,
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Top brand ── */}
      <div style={{ padding: `${ds(56, d)}px 80px 0` }}>
        <p
          style={{
            fontSize: 16,
            color: "#9ca3af",
            fontWeight: 500,
            letterSpacing: 2,
            margin: 0,
          }}
        >
          ✦{"  "}书跃 · BookLeap
        </p>
      </div>

      {/* ── Book title ── */}
      <div style={{ padding: `${ds(36, d)}px 80px 0` }}>
        <h1
          style={{
            fontSize: df(54, d),
            fontWeight: 800,
            color: "#111827",
            lineHeight: 1.3,
            margin: 0,
            letterSpacing: -0.5,
            wordBreak: "break-word",
          }}
        >
          {data.bookTitle}
        </h1>
        {content.hook && (
          <p
            style={{
              fontSize: df(22, d),
              color: "#6b7280",
              margin: `${ds(14, d)}px 0 0`,
              lineHeight: dl(1.6, d),
            }}
          >
            {content.hook}
          </p>
        )}
        <div
          style={{
            marginTop: ds(20, d),
            width: 48,
            height: 3,
            background: "#111827",
          }}
        />
      </div>

      {/* ── Summary ── */}
      <div style={{ padding: `${ds(34, d)}px 80px 0` }}>
        <p
          style={{
            fontSize: df(27, d),
            fontWeight: 700,
            color: "#111827",
            margin: 0,
            letterSpacing: 1,
          }}
        >
          【{NUM[0]} 核心观点】
        </p>
        <div
          style={{
            marginTop: ds(12, d),
            marginBottom: ds(14, d),
            height: 1,
            background: "#e5e7eb",
          }}
        />
        <p
          style={{
            fontSize: df(25, d),
            lineHeight: dl(1.9, d),
            color: "#374151",
            margin: 0,
          }}
        >
          {content.summary}
        </p>
      </div>

      {/* ── Insights ── */}
      {content.insights.length > 0 && (
        <div style={{ padding: `${ds(34, d)}px 80px 0` }}>
          <p
            style={{
              fontSize: df(27, d),
              fontWeight: 700,
              color: "#111827",
              margin: 0,
              letterSpacing: 1,
            }}
          >
            【{NUM[1]} 关键洞察】
          </p>
          <div
            style={{
              marginTop: ds(12, d),
              marginBottom: ds(14, d),
              height: 1,
              background: "#e5e7eb",
            }}
          />
          {content.insights.map((item, i) => (
            <p
              key={i}
              style={{
                fontSize: df(25, d),
                lineHeight: dl(1.9, d),
                color: "#374151",
                margin: i > 0 ? `${ds(14, d)}px 0 0` : 0,
              }}
            >
              {item}
            </p>
          ))}
        </div>
      )}

      {/* ── Actions ── */}
      {content.actions.length > 0 && (
        <div style={{ padding: `${ds(34, d)}px 80px 0`, flex: 1 }}>
          <p
            style={{
              fontSize: df(27, d),
              fontWeight: 700,
              color: "#111827",
              margin: 0,
              letterSpacing: 1,
            }}
          >
            【{NUM[2]} 行动建议】
          </p>
          <div
            style={{
              marginTop: ds(12, d),
              marginBottom: ds(14, d),
              height: 1,
              background: "#e5e7eb",
            }}
          />
          {content.actions.map((item, i) => (
            <p
              key={i}
              style={{
                fontSize: df(25, d),
                lineHeight: dl(1.9, d),
                color: "#374151",
                margin: i > 0 ? `${ds(14, d)}px 0 0` : 0,
              }}
            >
              {item}
            </p>
          ))}
        </div>
      )}

      {/* ── Bottom ── */}
      <div
        style={{
          padding: `${ds(44, d)}px 80px ${ds(48, d)}px`,
          borderTop: "1px solid #f3f4f6",
          marginTop: ds(36, d),
        }}
      >
        <p style={{ fontSize: 13, color: "#d1d5db", margin: 0, letterSpacing: 1 }}>
          书跃 · BookLeap
        </p>
        <p style={{ fontSize: 11, color: "#e5e7eb", margin: "6px 0 0" }}>
          从好书中完成认知跃迁
        </p>
      </div>
    </div>
  );
}
