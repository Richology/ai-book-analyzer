"use client";

import type { PosterData } from "./types";
import { computeDensity, df, dl, ds } from "./density";

const MONO = "'SF Mono','Fira Code','Cascadia Code',Menlo,monospace";
const SANS =
  "-apple-system,'PingFang SC','Helvetica Neue',Arial,sans-serif";

const BG = "#0d1117";
const SURFACE = "#161b22";
const BORDER = "#30363d";
const GREEN = "#3fb950";
const ORANGE = "#d29922";
const BLUE = "#58a6ff";
const GRAY = "#8b949e";
const WHITE = "#e6edf3";
const DIM = "#484f58";

export function AICodePoster({ data }: { data: PosterData }) {
  const { content } = data;
  const d = computeDensity(content);

  return (
    <div
      style={{
        width: 1080,
        minHeight: 1440,
        fontFamily: SANS,
        background: BG,
        display: "flex",
        flexDirection: "column",
        padding: 0,
        overflow: "hidden",
        color: WHITE,
      }}
    >
      {/* ── Terminal header ── */}
      <div style={{ padding: `${ds(48, d)}px 80px 0` }}>
        <p
          style={{
            fontFamily: MONO,
            fontSize: 15,
            color: GRAY,
            margin: 0,
            letterSpacing: 0.5,
          }}
        >
          <span style={{ color: "#f85149" }}>●</span>
          {"  "}
          <span style={{ color: ORANGE }}>●</span>
          {"  "}
          <span style={{ color: GREEN }}>●</span>
          {"    "}bookleap — analysis
        </p>
      </div>

      {/* ── Command line ── */}
      <div style={{ padding: `${ds(22, d)}px 80px 0` }}>
        <p
          style={{
            fontFamily: MONO,
            fontSize: df(20, d),
            color: GREEN,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: BLUE }}>$</span> analyzing book...
        </p>
        <p
          style={{
            fontFamily: MONO,
            fontSize: 16,
            color: DIM,
            margin: "4px 0 0",
          }}
        >
          ✓ parse complete · generating insights
        </p>
      </div>

      {/* ── Book title ── */}
      <div style={{ padding: `${ds(32, d)}px 80px 0` }}>
        <h1
          style={{
            fontSize: df(50, d),
            fontWeight: 800,
            color: WHITE,
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
              fontFamily: MONO,
              fontSize: df(18, d),
              color: GRAY,
              margin: `${ds(10, d)}px 0 0`,
              lineHeight: 1.5,
            }}
          >
            {`// ${content.hook}`}
          </p>
        )}
      </div>

      {/* ── File tree ── */}
      <div
        style={{
          margin: `${ds(28, d)}px 80px 0`,
          padding: `${ds(18, d)}px 28px`,
          background: SURFACE,
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          fontFamily: MONO,
          fontSize: 16,
          color: GRAY,
          lineHeight: 2,
          whiteSpace: "pre-wrap",
        }}
      >
        <span style={{ color: BLUE }}>book/</span>
        {"\n"}
        <span style={{ color: DIM }}>├── </span>
        <span style={{ color: GREEN }}>summary.md</span>
        {"\n"}
        <span style={{ color: DIM }}>├── </span>
        <span style={{ color: ORANGE }}>insights/</span>
        {"\n"}
        <span style={{ color: DIM }}>├── </span>
        <span style={{ color: ORANGE }}>actions/</span>
        {"\n"}
        <span style={{ color: DIM }}>└── </span>
        <span style={{ color: GRAY }}>README.md</span>
      </div>

      {/* ── # summary ── */}
      <div style={{ padding: `${ds(36, d)}px 80px 0` }}>
        <p
          style={{
            fontFamily: MONO,
            fontSize: df(22, d),
            fontWeight: 700,
            color: GREEN,
            margin: 0,
            letterSpacing: 1,
          }}
        >
          # summary
        </p>
        <div style={{ marginTop: ds(10, d), marginBottom: ds(14, d), height: 1, background: BORDER }} />
        <p
          style={{
            fontSize: df(25, d),
            lineHeight: dl(1.9, d),
            color: WHITE,
            margin: 0,
            opacity: 0.9,
          }}
        >
          {content.summary}
        </p>
      </div>

      {/* ── # insights ── */}
      {content.insights.length > 0 && (
        <div style={{ padding: `${ds(32, d)}px 80px 0` }}>
          <p
            style={{
              fontFamily: MONO,
              fontSize: df(22, d),
              fontWeight: 700,
              color: BLUE,
              margin: 0,
              letterSpacing: 1,
            }}
          >
            # insights
          </p>
          <div style={{ marginTop: ds(10, d), marginBottom: ds(14, d), height: 1, background: BORDER }} />
          {content.insights.map((item, i) => (
            <p
              key={i}
              style={{
                fontSize: df(23, d),
                lineHeight: dl(1.8, d),
                color: WHITE,
                margin: i > 0 ? `${ds(14, d)}px 0 0` : 0,
                opacity: 0.85,
              }}
            >
              <span style={{ fontFamily: MONO, color: BLUE, marginRight: 12 }}>▸</span>
              {item}
            </p>
          ))}
        </div>
      )}

      {/* ── # actions ── */}
      {content.actions.length > 0 && (
        <div style={{ padding: `${ds(32, d)}px 80px 0`, flex: 1 }}>
          <p
            style={{
              fontFamily: MONO,
              fontSize: df(22, d),
              fontWeight: 700,
              color: ORANGE,
              margin: 0,
              letterSpacing: 1,
            }}
          >
            # actions
          </p>
          <div style={{ marginTop: ds(10, d), marginBottom: ds(14, d), height: 1, background: BORDER }} />
          {content.actions.map((item, i) => (
            <p
              key={i}
              style={{
                fontSize: df(23, d),
                lineHeight: dl(1.8, d),
                color: WHITE,
                margin: i > 0 ? `${ds(14, d)}px 0 0` : 0,
                opacity: 0.85,
              }}
            >
              <span style={{ fontFamily: MONO, color: ORANGE, marginRight: 12 }}>→</span>
              {item}
            </p>
          ))}
        </div>
      )}

      {/* ── Bottom ── */}
      <div
        style={{
          padding: `${ds(44, d)}px 80px ${ds(48, d)}px`,
          borderTop: `1px solid ${BORDER}`,
          marginTop: ds(36, d),
        }}
      >
        <p style={{ fontFamily: MONO, fontSize: 14, color: DIM, margin: 0, letterSpacing: 0.5 }}>
          书跃 · BookLeap
        </p>
        <p style={{ fontSize: 11, color: DIM, margin: "6px 0 0", opacity: 0.7 }}>
          从好书中完成认知跃迁
        </p>
      </div>
    </div>
  );
}
