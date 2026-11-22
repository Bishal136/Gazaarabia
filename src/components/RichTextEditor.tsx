"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef } from "react";

const TinyMCEEditor = dynamic(() => import("@tinymce/tinymce-react").then((m) => m.Editor), {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});

export function getPlainTextLength(html: string): number {
  if (!html) return 0;
  const clean = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  minHeight?: number;
  maxLength?: number;
  helperText?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  label,
  required = false,
  minHeight = 300,
  maxLength,
  helperText,
}: RichTextEditorProps) {
  const maxLengthRef = useRef<number | undefined>(maxLength);
  maxLengthRef.current = maxLength;

  const charCount = useMemo(() => getPlainTextLength(value), [value]);
  const isOverLimit = Boolean(maxLength && charCount > maxLength);
  const isNearLimit = Boolean(maxLength && !isOverLimit && charCount >= maxLength * 0.85);

  const handleImageUpload = (blobInfo: any): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.withCredentials = true;
      xhr.open("POST", "/api/upload?folder=editor");

      xhr.upload.onprogress = (e) => {
        // Handle upload progress if needed
      };

      xhr.onload = () => {
        if (xhr.status !== 200) {
          reject({
            message: `Upload failed: ${xhr.status}`,
            remove: true,
          });
          return;
        }
        const json = JSON.parse(xhr.responseText);
        if (!json || typeof json.url !== "string") {
          reject("Invalid response from server");
          return;
        }
        resolve(json.url as string);
      };

      xhr.onerror = () => {
        reject("Image upload failed. Check your connection.");
      };

      const formData = new FormData();
      formData.append("file", blobInfo.blob(), blobInfo.filename());
      xhr.send(formData);
    });
  };

  return (
    <>
      <style jsx>{`
        .rich-text-editor-wrapper {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .rich-text-editor-wrapper:hover {
          border-color: #d1d5db;
        }

        .rich-text-editor-wrapper:focus-within {
          border-color: var(--brand-primary, #c73030);
          box-shadow: 0 0 0 2px rgba(199, 48, 48, 0.1);
        }

        .rich-text-editor-wrapper.has-error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15) !important;
        }

        .editor-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .editor-label.required::after {
          content: " *";
          color: #dc2626;
        }

        /* TinyMCE styling */
        :global(.tox.tox-tinymce) {
          border: none !important;
        }

        :global(.tox-editor-header) {
          background-color: #f9fafb !important;
          border-bottom: 1px solid #e5e7eb !important;
        }

        :global(.tox .tox-tbtn) {
          color: #6b7280 !important;
        }

        :global(.tox .tox-tbtn:hover),
        :global(.tox .tox-tbtn:focus),
        :global(.tox .tox-tbtn--active) {
          color: var(--brand-primary, #c73030) !important;
          background-color: rgba(199, 48, 48, 0.1) !important;
        }

        :global(.tox .tox-tbtn:hover::before),
        :global(.tox .tox-tbtn:focus::before) {
          background-color: rgba(199, 48, 48, 0.1) !important;
        }

        :global(.tox .tox-edit-area__iframe) {
          font-family: inherit !important;
          font-size: 0.95rem !important;
          line-height: 1.6 !important;
          color: #1f2937 !important;
        }

        :global(.tox .tox-menubar) {
          background-color: #f9fafb !important;
          border-bottom: 1px solid #e5e7eb !important;
        }

        :global(.tox .tox-mbtn) {
          color: #6b7280 !important;
        }

        :global(.tox .tox-mbtn:hover) {
          color: var(--brand-primary, #c73030) !important;
        }
      `}</style>

      <div>
        {label && (
          <label className={`editor-label ${required ? "required" : ""}`}>
            {label}
          </label>
        )}
        <div className={`rich-text-editor-wrapper ${isOverLimit ? "has-error" : ""}`}>
          <TinyMCEEditor
            tinymceScriptSrc="/tinymce/tinymce.min.js"
            licenseKey="gpl"
            value={value}
            onEditorChange={onChange}
            init={{
              height: minHeight,
              menubar: true,
              plugins: [
                "advlist",
                "autolink",
                "lists",
                "link",
                "image",
                "charmap",
                "preview",
                "anchor",
                "searchreplace",
                "wordcount",
                "visualblocks",
                "visualchars",
                "code",
                "fullscreen",
                "insertdatetime",
                "media",
                "nonbreaking",
                "save",
                "table",
                "directionality",
                "emoticons",
                "codesample",
              ],
              toolbar:
                "undo redo | blocks | bold italic backcolor forecolor | " +
                "alignleft aligncenter alignright alignjustify | " +
                "bullist numlist outdent indent | " +
                "link image media table | " +
                "searchreplace | " +
                "code fullscreen | " +
                "removeformat",
              toolbar_sticky: true,
              toolbar_location: "top",
              relative_urls: false,
              remove_script_host: false,
              convert_urls: false,
              automatic_uploads: true,
              file_picker_types: "image",
              images_upload_handler: handleImageUpload as any,
              font_family_formats:
                "Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monospace; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings",
              font_size_formats: "8px 10px 12px 14px 16px 18px 20px 24px 28px 32px 36px",
              content_style:
                "body { font-family: inherit; font-size: 14px; line-height: 1.6; } img { max-width: 100%; }",
              placeholder: placeholder,
              branding: false,
              promotion: false,
              setup: (editor: any) => {
                editor.on("keydown", (e: any) => {
                  const max = maxLengthRef.current;
                  if (!max) return;

                  const allowedKeys = [
                    "Backspace",
                    "Delete",
                    "ArrowLeft",
                    "ArrowRight",
                    "ArrowUp",
                    "ArrowDown",
                    "Home",
                    "End",
                    "PageUp",
                    "PageDown",
                    "Escape",
                    "Tab",
                  ];

                  if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
                    return;
                  }

                  // If user has highlighted text, replacement will not necessarily exceed
                  const selection = editor.selection?.getContent({ format: "text" }) || "";
                  if (selection.length > 0) {
                    return;
                  }

                  const rawContent = editor.getContent({ format: "text" }) || "";
                  const cleanLen = rawContent.replace(/\s+/g, " ").trim().length;

                  if (cleanLen >= max) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                });

                editor.on("paste", (e: any) => {
                  const max = maxLengthRef.current;
                  if (!max) return;

                  const clipboardData = e.clipboardData || (window as any).clipboardData;
                  if (!clipboardData) return;

                  const pastedText = clipboardData.getData("text") || "";
                  if (!pastedText) return;

                  const rawContent = editor.getContent({ format: "text" }) || "";
                  const currentLen = rawContent.replace(/\s+/g, " ").trim().length;

                  const selected = editor.selection?.getContent({ format: "text" }) || "";
                  const selectedLen = selected.replace(/\s+/g, " ").trim().length;

                  const remaining = max - Math.max(0, currentLen - selectedLen);

                  if (remaining <= 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }

                  if (pastedText.length > remaining) {
                    e.preventDefault();
                    e.stopPropagation();
                    const truncated = pastedText.substring(0, remaining);
                    editor.insertContent(editor.dom.encode(truncated));
                  }
                });
              },
            }}
          />
        </div>

        {maxLength && (
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 px-0.5 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500">
              {isOverLimit ? (
                <span className="text-red-600 font-semibold flex items-center gap-1">
                  <svg
                    className="w-4 h-4 inline flex-shrink-0 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Limit exceeded by {charCount - maxLength} characters (maximum {maxLength})
                </span>
              ) : (
                <span>{helperText || `Maximum ${maxLength} characters.`}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium tabular-nums transition-colors ${
                  isOverLimit
                    ? "bg-red-100 text-red-700 font-bold border border-red-300"
                    : isNearLimit
                    ? "bg-amber-100 text-amber-800 font-semibold border border-amber-300"
                    : "bg-gray-100 text-gray-600 border border-gray-200"
                }`}
              >
                {charCount} / {maxLength}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
