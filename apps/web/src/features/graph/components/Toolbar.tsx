"use client";

import { useEffect, useMemo, useState } from "react";

import type { GraphIndex } from "@cyoa/shared";
import { Download, FilePlus2, RotateCcw, Save, Sparkles, Upload } from "lucide-react";

import { setToolbarSearchOpen } from "@/features/ui/uiSlice";
import { useAppDispatch } from "@/store/hooks";

import LayoutButton from "./LayoutButton";

const actionStyle = {
  height: 36,
  padding: "0 12px",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  background: "var(--surface-raised)",
  color: "var(--text-strong)",
  cursor: "pointer",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  lineHeight: 1,
};

function makePreviewSnippet(text: string, query: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "(No content)";

  const index = normalized.toLowerCase().indexOf(query);
  if (index < 0) return normalized.slice(0, 96) + (normalized.length > 96 ? "..." : "");

  const start = Math.max(0, index - 34);
  const end = Math.min(normalized.length, index + query.length + 60);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalized.length ? "..." : "";
  return `${prefix}${normalized.slice(start, end)}${suffix}`;
}

export default function Toolbar({
  index,
  onSelectNode,
  onNewNode,
  onAutoLayout,
  onExport,
  onImport,
  onReset,
  onSave,
  saveState,
  showServerSaveAction,
}: {
  index: GraphIndex | null;
  onSelectNode: (id: string) => void;
  onNewNode: () => void;
  onAutoLayout: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
  onSave: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
  showServerSaveAction: boolean;
}) {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const normalizedQuery = query.trim().toLowerCase();

  const matchedNodeIds = useMemo(() => {
    if (!index || !normalizedQuery) return [];

    return Object.values(index.nodeById)
      .filter((node) => {
        const title = node.title.toLowerCase();
        const body = node.body.toLowerCase();
        return title.includes(normalizedQuery) || body.includes(normalizedQuery);
      })
      .map((node) => node.id);
  }, [index, normalizedQuery]);

  const matchedNodePreviews = useMemo(() => {
    if (!index || !normalizedQuery) return [];

    return matchedNodeIds
      .map((id, listIndex) => {
        const node = index.nodeById[id];
        if (!node) return null;

        const hasTitleMatch = node.title.toLowerCase().includes(normalizedQuery);
        const snippetSource = hasTitleMatch ? node.title : node.body;

        return {
          id,
          listIndex,
          title: node.title || "(Untitled)",
          snippet: makePreviewSnippet(snippetSource, normalizedQuery),
        };
      })
      .filter((item): item is { id: string; listIndex: number; title: string; snippet: string } =>
        Boolean(item),
      )
      .slice(0, 8);
  }, [index, matchedNodeIds, normalizedQuery]);

  const hasQuery = normalizedQuery.length > 0;
  const hasMatches = matchedNodeIds.length > 0;
  const currentMatchIndex = hasMatches ? Math.min(activeMatchIndex, matchedNodeIds.length - 1) : 0;

  useEffect(() => {
    if (!normalizedQuery || matchedNodeIds.length === 0) return;
    const nextId = matchedNodeIds[currentMatchIndex] ?? matchedNodeIds[0];
    if (nextId) onSelectNode(nextId);
  }, [currentMatchIndex, matchedNodeIds, normalizedQuery, onSelectNode]);

  useEffect(() => {
    dispatch(setToolbarSearchOpen(normalizedQuery.length > 0));
    return () => {
      dispatch(setToolbarSearchOpen(false));
    };
  }, [dispatch, normalizedQuery]);

  const jumpMatch = (direction: 1 | -1) => {
    if (!hasMatches) return;
    setActiveMatchIndex((current) => {
      const next = (current + direction + matchedNodeIds.length) % matchedNodeIds.length;
      return next;
    });
  };

  const jumpToMatch = (matchIndex: number) => {
    if (!hasMatches) return;
    if (matchIndex < 0 || matchIndex >= matchedNodeIds.length) return;
    setActiveMatchIndex(matchIndex);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        color: "var(--text-strong)",
        background: "color-mix(in srgb, var(--surface-raised) 90%, transparent)",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Author Tools</div>
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 300,
            flex: "1 1 520px",
            maxWidth: 760,
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveMatchIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                jumpMatch(e.shiftKey ? -1 : 1);
              }
            }}
            placeholder="Search nodes by title or content"
            aria-label="Search nodes"
            style={{
              ...actionStyle,
              cursor: "text",
              justifyContent: "flex-start",
              flex: 1,
              minWidth: 180,
              fontWeight: 500,
            }}
          />
          <button
            type="button"
            onClick={() => jumpMatch(-1)}
            disabled={!hasMatches}
            style={{ ...actionStyle, width: 42, padding: 0, opacity: hasMatches ? 1 : 0.45 }}
            aria-label="Previous search result"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => jumpMatch(1)}
            disabled={!hasMatches}
            style={{ ...actionStyle, width: 42, padding: 0, opacity: hasMatches ? 1 : 0.45 }}
            aria-label="Next search result"
          >
            ↓
          </button>
          <div
            aria-live="polite"
            style={{ minWidth: 78, textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}
          >
            {!hasQuery
              ? ""
              : hasMatches
                ? `${currentMatchIndex + 1}/${matchedNodeIds.length}`
                : "0 matches"}
          </div>

          {hasQuery && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-raised)",
                overflow: "hidden",
                boxShadow: "0 12px 26px color-mix(in srgb, black 20%, transparent)",
                zIndex: 30,
                maxHeight: 300,
              }}
            >
              {!hasMatches && (
                <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-muted)" }}>
                  No nodes matched this search.
                </div>
              )}

              {hasMatches && (
                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {matchedNodePreviews.map((item) => {
                    const isActive = item.listIndex === currentMatchIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => jumpToMatch(item.listIndex)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "8px 12px",
                          border: 0,
                          borderTop: "1px solid var(--border-subtle)",
                          background: isActive
                            ? "color-mix(in srgb, var(--interactive-primary) 10%, var(--surface-raised))"
                            : "transparent",
                          color: "var(--text-strong)",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 12,
                            color: "var(--text-muted)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.snippet}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 12 }} />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReset();
          }}
          style={actionStyle}
        >
          <RotateCcw size={15} />
          Reset
        </button>

        <LayoutButton
          onClick={onAutoLayout}
          disabled={!index || Object.keys(index.nodeById).length < 2}
        />

        {showServerSaveAction ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            style={{ ...actionStyle, minWidth: 92 }}
          >
            <Save size={15} />
            {saveState === "saving" ? "Saving" : saveState === "saved" ? "Saved" : "Save"}
          </button>
        ) : null}

        <button
          type="button"
          disabled
          title="Coming in Phase 7"
          style={{ ...actionStyle, opacity: 0.58 }}
        >
          <Sparkles size={15} />
          AI: Suggest branches
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExport();
          }}
          style={actionStyle}
        >
          <Download size={15} />
          Export
        </button>

        <label style={actionStyle} onClick={(e) => e.stopPropagation()}>
          <Upload size={15} />
          Import
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.currentTarget.value = "";
            }}
          />
        </label>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNewNode();
          }}
          style={{
            ...actionStyle,
            borderColor: "color-mix(in srgb, var(--interactive-primary) 45%, var(--border-subtle))",
            background: "color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-raised))",
          }}
        >
          <FilePlus2 size={15} />
          New node
        </button>
      </div>
    </div>
  );
}
