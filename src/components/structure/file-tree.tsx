"use client";

import { useState } from "react";
import { ChevronRight, FileCode2, FolderClosed, FolderOpen } from "lucide-react";
import type { TreeNode } from "@/lib/types/analysis";
import { formatCompact } from "@/lib/utils/format";

interface FileTreeProps {
  tree: TreeNode[];
  /** initially expanded paths */
  defaultExpanded?: string[];
}

/** Dense expandable technical file explorer. */
export function FileTree({ tree, defaultExpanded = [] }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(defaultExpanded));

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <ul role="tree" aria-label="Repository file tree" className="min-w-0 select-none font-mono text-xs">
      {tree.map((node) => (
        <TreeRow key={node.path} node={node} depth={0} expanded={expanded} onToggle={toggle} />
      ))}
    </ul>
  );
}

function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
}) {
  const isDir = node.type === "dir";
  const open = expanded.has(node.path);

  if (isDir) {
    return (
      <li role="treeitem" aria-expanded={open} aria-selected={false}>
        <button
          type="button"
          onClick={() => onToggle(node.path)}
          className="flex w-full items-center gap-1.5 border-b border-line/60 py-1.5 pr-2 text-left hover:bg-acid/20 focus-visible:outline-acid"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <ChevronRight className={`size-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden />
          {open ? <FolderOpen className="size-3.5 shrink-0 text-violet" aria-hidden /> : <FolderClosed className="size-3.5 shrink-0 text-violet" aria-hidden />}
          <span className="truncate font-bold">{node.name}/</span>
        </button>
        {open && node.children && (
          <ul role="group">
            {node.children.map((child) => (
              <TreeRow key={child.path} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li role="treeitem" aria-selected={false} className="flex items-center gap-1.5 border-b border-line/60 py-1.5 pr-2 hover:bg-acid/20" style={{ paddingLeft: `${depth * 14 + 8 + 18}px` }}>
      <FileCode2 className="size-3.5 shrink-0 text-muted" aria-hidden />
      <span className="truncate">{node.name}</span>
      {node.loc !== undefined && (
        <span className="ml-auto shrink-0 text-[10px] tabular-nums text-muted">{formatCompact(node.loc)}</span>
      )}
    </li>
  );
}
