/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Mark } from '@tiptap/core';
import { Bold, Italic, List, ListOrdered, Link2, Unlink, Palette, Type } from 'lucide-react';

// Custom inline FontSize extension to generate <span style="font-size: Xrem">
const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: el => el.style.fontSize,
        renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style]', getAttrs: el => el.style.fontSize ? { fontSize: el.style.fontSize } : false }];
  },
  renderHTML({ HTMLAttributes }) { return ['span', HTMLAttributes, 0]; },
  addCommands() {
    return {
      setFontSize: fontSize => ({ commands }) => commands.setMark(this.name, { fontSize }),
      unsetFontSize: () => ({ commands }) => commands.unsetMark(this.name),
    };
  },
});

export const TipTapEditor = ({ value, onChange, placeholder = 'Write biography...', className = '' }: any) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-blue-600 underline hover:text-blue-800 transition-colors',
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }
      }),
      TextStyle,
      Color,
      FontSize,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      const html = editor.getHTML();
      if (html !== value) {
        onChange(html === '<p></p>' ? '' : html);
      }
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={`rounded-xl border border-gray-300 bg-white overflow-hidden shadow-sm flex flex-col ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 py-2">
        {(window as any).APP_FEATURES?.newEditor && (
          <div className="order-last ml-auto mr-1 flex items-center">
            <span className="text-[9px] font-black uppercase tracking-[0.15em] bg-[#ceb079]/20 text-[#ceb079] border border-[#ceb079]/30 px-2 py-0.5 rounded-md">
              New Editor
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg transition-all ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg transition-all ${editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <div className="h-4 w-[1px] bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg transition-all ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg transition-all ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Ordered List"
        >
          <ListOrdered size={16} />
        </button>
        <div className="h-4 w-[1px] bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={setLink}
          className={`p-1.5 rounded-lg transition-all ${editor.isActive('link') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Link"
        >
          <Link2 size={16} />
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-all"
            title="Unlink"
          >
            <Unlink size={16} />
          </button>
        )}

        <div className="h-4 w-[1px] bg-gray-300 mx-1" />
        <div className="flex items-center gap-1.5 px-1.5" title="Text Color">
          <Palette size={16} className="text-gray-600 animate-none" />
          <div className="relative flex items-center justify-center w-5 h-5 rounded border border-gray-300 overflow-hidden bg-gray-100 shadow-inner">
            {editor.getAttributes('textStyle').color ? (
              <div 
                className="w-full h-full pointer-events-none" 
                style={{ backgroundColor: editor.getAttributes('textStyle').color }} 
              />
            ) : (
              <div className="w-full h-full relative bg-white flex items-center justify-center overflow-hidden pointer-events-none" title="Default / Clear Color">
                <div className="absolute w-[1px] h-[140%] bg-red-500 rotate-45" />
              </div>
            )}
            <input
              type="color"
              value={editor.getAttributes('textStyle').color || '#000000'}
              onInput={e => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer p-0 m-0 border-0 z-10"
            />
          </div>
          {editor.getAttributes('textStyle').color && (
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="text-[10px] font-bold text-red-500 hover:text-red-700 ml-0.5 cursor-pointer"
              title="Reset Color"
            >
              Reset
            </button>
          )}
        </div>

        <div className="h-4 w-[1px] bg-gray-300 mx-1" />
        <div className="flex items-center gap-1.5 px-1.5" title="Font Size">
          <Type size={16} className="text-gray-600" />
          <select
            value={editor.getAttributes('fontSize').fontSize || ''}
            onChange={e => {
              const val = e.target.value;
              if (val) {
                editor.chain().focus().setFontSize(val).run();
              } else {
                editor.chain().focus().unsetFontSize().run();
              }
            }}
            className="text-xs border border-gray-300 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="">Default</option>
            <option value="0.75rem">Small</option>
            <option value="1rem">Normal</option>
            <option value="1.5rem">Large</option>
            <option value="2rem">X-Large</option>
            <option value="3rem">Huge</option>
          </select>
        </div>
      </div>
      <EditorContent 
        editor={editor} 
        className="px-4 py-3 min-h-[180px] focus:outline-none prose prose-sm max-w-none"
      />
    </div>
  );
};

export const TipTapMinimal = ({ value, onChange, placeholder = 'Enter details...', className = '' }: any) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-blue-600 underline hover:text-blue-800 transition-colors',
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }
      }),
      TextStyle,
      Color,
      FontSize,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      const html = editor.getHTML();
      if (html !== value) {
        onChange(html === '<p></p>' ? '' : html);
      }
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={`rounded-xl border border-gray-300 bg-white overflow-hidden shadow-sm flex flex-col ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded transition-all ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded transition-all ${editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onClick={setLink}
          className={`p-1 rounded transition-all ${editor.isActive('link') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Link"
        >
          <Link2 size={14} />
        </button>
        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="p-1 rounded text-red-500 hover:bg-red-50 transition-all"
            title="Unlink"
          >
            <Unlink size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded transition-all ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Bullet List"
        >
          <List size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded transition-all ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'}`}
          title="Ordered List"
        >
          <ListOrdered size={14} />
        </button>

        <div className="h-4 w-[1px] bg-gray-300 mx-1" />
        <div className="flex items-center gap-1 px-1" title="Text Color">
          <Palette size={14} className="text-gray-600" />
          <div className="relative flex items-center justify-center w-4 h-4 rounded border border-gray-300 overflow-hidden bg-gray-100 shadow-inner">
            {editor.getAttributes('textStyle').color ? (
              <div 
                className="w-full h-full pointer-events-none" 
                style={{ backgroundColor: editor.getAttributes('textStyle').color }} 
              />
            ) : (
              <div className="w-full h-full relative bg-white flex items-center justify-center overflow-hidden pointer-events-none" title="Default / Clear Color">
                <div className="absolute w-[1px] h-[140%] bg-red-500 rotate-45" />
              </div>
            )}
            <input
              type="color"
              value={editor.getAttributes('textStyle').color || '#000000'}
              onInput={e => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer p-0 m-0 border-0 z-10"
            />
          </div>
          {editor.getAttributes('textStyle').color && (
            <button
              type="button"
              onClick={() => editor.chain().focus().unsetColor().run()}
              className="text-[9px] font-bold text-red-500 hover:text-red-700 ml-0.5 cursor-pointer"
              title="Reset Color"
            >
              Reset
            </button>
          )}
        </div>

        <div className="h-4 w-[1px] bg-gray-300 mx-1" />
        <div className="flex items-center gap-1 px-1" title="Font Size">
          <Type size={14} className="text-gray-600" />
          <select
            value={editor.getAttributes('fontSize').fontSize || ''}
            onChange={e => {
              const val = e.target.value;
              if (val) {
                editor.chain().focus().setFontSize(val).run();
              } else {
                editor.chain().focus().unsetFontSize().run();
              }
            }}
            className="text-[11px] border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="">Default</option>
            <option value="0.75rem">Small</option>
            <option value="1rem">Normal</option>
            <option value="1.5rem">Large</option>
            <option value="2rem">X-Large</option>
            <option value="3rem">Huge</option>
          </select>
        </div>
      </div>
      <EditorContent 
        editor={editor} 
        className="px-3 py-2 min-h-[60px] focus:outline-none prose prose-sm max-w-none"
      />
    </div>
  );
};
