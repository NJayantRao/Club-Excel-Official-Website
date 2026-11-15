import { Fragment } from "react";

// Matches http:// or https:// links only (never javascript:, data:, etc.)
const URL_SPLIT_RE = /(https?:\/\/[^\s<>"']+)/g;
const TRAILING_PUNCTUATION_RE = /[.,;:!?)\]]+$/;

interface Props {
  text: string;
  className?: string;
}

/**
 * Renders plain text and turns any http(s) URL in it into a clickable link
 * that opens in a new tab. Text is rendered as text (never as HTML), so it is
 * safe to use with user-written descriptions.
 */
export default function LinkifiedText({ text, className }: Props) {
  // split() with a capture group puts the URLs at the odd indexes
  const parts = text.split(URL_SPLIT_RE);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>;

        const url = part.replace(TRAILING_PUNCTUATION_RE, "");
        const trailing = part.slice(url.length);

        return (
          <Fragment key={index}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-blue-400 underline underline-offset-2 hover:text-blue-300"
            >
              {url}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </span>
  );
}
