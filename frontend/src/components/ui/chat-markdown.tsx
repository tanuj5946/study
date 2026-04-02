import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import { CopyButton } from "@/components/ui/copy-button";

interface ChatMarkdownProps {
  text: string;
}

export function ChatMarkdown({ text }: ChatMarkdownProps) {
  return (
    <div className="text-sm leading-relaxed [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_li]:marker:text-muted-foreground [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline">
      <ReactMarkdown
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, ...props }) {
            const code = String(children ?? "").replace(/\n$/, "");
            const language = className?.match(/language-([\w-]+)/)?.[1];
            const isBlock = Boolean(language) || code.includes("\n");

            if (!isBlock) {
              return (
                <code
                  {...props}
                  className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[0.9em] text-foreground"
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="my-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                  <span className="text-[11px] uppercase tracking-wide text-slate-400">
                    {language ?? "code"}
                  </span>
                  <CopyButton
                    text={code}
                    label="Copy code"
                    className="h-7 px-2 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white"
                  />
                </div>
                <SyntaxHighlighter
                  {...props}
                  language={language ?? "text"}
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    background: "transparent",
                    borderRadius: 0,
                    fontSize: "0.75rem",
                    lineHeight: 1.75,
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                    },
                  }}
                  wrapLongLines
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
