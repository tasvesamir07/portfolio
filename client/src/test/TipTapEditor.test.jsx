import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TipTapEditor, TipTapMinimal } from '../components/TipTapEditor';

// Setup mock for @tiptap/react
const mockChain = {
  focus: vi.fn().mockReturnThis(),
  toggleBold: vi.fn().mockReturnThis(),
  toggleItalic: vi.fn().mockReturnThis(),
  toggleBulletList: vi.fn().mockReturnThis(),
  toggleOrderedList: vi.fn().mockReturnThis(),
  setLink: vi.fn().mockReturnThis(),
  unsetLink: vi.fn().mockReturnThis(),
  setColor: vi.fn().mockReturnThis(),
  unsetColor: vi.fn().mockReturnThis(),
  setFontSize: vi.fn().mockReturnThis(),
  unsetFontSize: vi.fn().mockReturnThis(),
  extendMarkRange: vi.fn().mockReturnThis(),
  run: vi.fn().mockReturnThis()
};

let mockEditor = null;
let capturedConfig = null;

vi.mock('@tiptap/react', () => ({
  EditorContent: () => <div data-testid="editor-content" />,
  useEditor: (config) => {
    capturedConfig = config;
    return mockEditor;
  }
}));

describe('TipTap Editor Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.APP_FEATURES = {};
    mockEditor = {
      isDestroyed: false,
      getHTML: vi.fn(() => '<p>Hello</p>'),
      commands: {
        setContent: vi.fn()
      },
      isActive: vi.fn((type) => {
        if (type === 'bold') return true;
        if (type === 'italic') return false;
        if (type === 'link') return true;
        return false;
      }),
      getAttributes: vi.fn((type) => {
        if (type === 'link') return { href: 'https://test.com' };
        if (type === 'textStyle') return { color: '#ff0000' };
        if (type === 'fontSize') return { fontSize: '1.5rem' };
        return {};
      }),
      chain: vi.fn(() => mockChain)
    };
  });

  describe('TipTapEditor Component', () => {
    it('renders with toolbar buttons and triggers events', () => {
      const onChange = vi.fn();
      render(<TipTapEditor value="Hello" onChange={onChange} />);

      // Verify the editor editor content renders
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();

      // Bold button check
      const boldBtn = screen.getByTitle('Bold');
      fireEvent.click(boldBtn);
      expect(mockChain.toggleBold).toHaveBeenCalled();

      // Italic button check
      const italicBtn = screen.getByTitle('Italic');
      fireEvent.click(italicBtn);
      expect(mockChain.toggleItalic).toHaveBeenCalled();

      // Bullet List button check
      const bulletListBtn = screen.getByTitle('Bullet List');
      fireEvent.click(bulletListBtn);
      expect(mockChain.toggleBulletList).toHaveBeenCalled();

      // Ordered List button check
      const orderedListBtn = screen.getByTitle('Ordered List');
      fireEvent.click(orderedListBtn);
      expect(mockChain.toggleOrderedList).toHaveBeenCalled();
    });

    it('handles font size selection', () => {
      render(<TipTapEditor value="Hello" onChange={() => {}} />);
      const select = screen.getByRole('combobox');
      
      // Select small font size
      fireEvent.change(select, { target: { value: '0.75rem' } });
      expect(mockChain.setFontSize).toHaveBeenCalledWith('0.75rem');

      // Select default font size
      fireEvent.change(select, { target: { value: '' } });
      expect(mockChain.unsetFontSize).toHaveBeenCalled();
    });

    it('handles color inputs and reset', () => {
      const { container } = render(<TipTapEditor value="Hello" onChange={() => {}} />);
      const colorInput = container.querySelector('input[type="color"]');
      
      fireEvent.input(colorInput, { target: { value: '#00ff00' } });
      expect(mockChain.setColor).toHaveBeenCalledWith('#00ff00');

      const resetBtn = screen.getByTitle('Reset Color');
      fireEvent.click(resetBtn);
      expect(mockChain.unsetColor).toHaveBeenCalled();
    });

    it('handles links setting and unsetting via prompt', () => {
      const promptMock = vi.spyOn(window, 'prompt');
      render(<TipTapEditor value="Hello" onChange={() => {}} />);

      // Link button with URL
      promptMock.mockReturnValue('https://google.com');
      const linkBtn = screen.getByTitle('Link');
      fireEvent.click(linkBtn);
      expect(mockChain.setLink).toHaveBeenCalledWith({ href: 'https://google.com' });

      // Link button with empty string (clears link)
      promptMock.mockReturnValue('');
      fireEvent.click(linkBtn);
      expect(mockChain.unsetLink).toHaveBeenCalled();

      // Unlink button directly clears it
      const unlinkBtn = screen.getByTitle('Unlink');
      fireEvent.click(unlinkBtn);
      expect(mockChain.unsetLink).toHaveBeenCalled();

      promptMock.mockRestore();
    });

    it('handles prompt cancel', () => {
      const promptMock = vi.spyOn(window, 'prompt').mockReturnValue(null);
      render(<TipTapEditor value="Hello" onChange={() => {}} />);
      const linkBtn = screen.getByTitle('Link');
      fireEvent.click(linkBtn);
      expect(mockChain.setLink).not.toHaveBeenCalled();
      promptMock.mockRestore();
    });

    it('displays feature badge when APP_FEATURES.newEditor is true', () => {
      window.APP_FEATURES.newEditor = true;
      render(<TipTapEditor value="Hello" onChange={() => {}} />);
      expect(screen.getByText('New Editor')).toBeInTheDocument();
    });

    it('triggers onUpdate callback on editor content updates', () => {
      const onChange = vi.fn();
      render(<TipTapEditor value="Hello" onChange={onChange} />);

      expect(capturedConfig).toBeDefined();

      // Update with new content
      mockEditor.getHTML.mockReturnValue('<p>Updated Content</p>');
      capturedConfig.onUpdate({ editor: mockEditor });
      expect(onChange).toHaveBeenCalledWith('<p>Updated Content</p>');

      // Update with empty content
      mockEditor.getHTML.mockReturnValue('<p></p>');
      capturedConfig.onUpdate({ editor: mockEditor });
      expect(onChange).toHaveBeenCalledWith('');

      // Update when destroyed (should ignore)
      onChange.mockClear();
      mockEditor.isDestroyed = true;
      capturedConfig.onUpdate({ editor: mockEditor });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('returns null when editor is not initialized', () => {
      mockEditor = null;
      const { container } = render(<TipTapEditor value="Hello" onChange={() => {}} />);
      expect(container.firstChild).toBeNull();
    });

    it('tests custom FontSize mark configuration', () => {
      render(<TipTapEditor value="Hello" onChange={() => {}} />);
      const fontSizeExtension = capturedConfig.extensions.find(ext => ext.name === 'fontSize');
      expect(fontSizeExtension).toBeDefined();

      // Test addAttributes
      const attrs = fontSizeExtension.config.addAttributes();
      expect(attrs).toHaveProperty('fontSize');
      
      const parseHTMLResult = attrs.fontSize.parseHTML({ style: { fontSize: '1.5rem' } });
      expect(parseHTMLResult).toBe('1.5rem');

      const renderHTMLResult = attrs.fontSize.renderHTML({ fontSize: '1.5rem' });
      expect(renderHTMLResult).toEqual({ style: 'font-size: 1.5rem' });
      
      const renderHTMLResultEmpty = attrs.fontSize.renderHTML({});
      expect(renderHTMLResultEmpty).toEqual({});

      // Test parseHTML
      const parseHTMLSpecs = fontSizeExtension.config.parseHTML();
      expect(parseHTMLSpecs[0].tag).toBe('span[style]');
      const getAttrsResult = parseHTMLSpecs[0].getAttrs({ style: { fontSize: '2rem' } });
      expect(getAttrsResult).toEqual({ fontSize: '2rem' });
      
      const getAttrsResultFalse = parseHTMLSpecs[0].getAttrs({ style: {} });
      expect(getAttrsResultFalse).toBe(false);

      // Test renderHTML
      const renderResult = fontSizeExtension.config.renderHTML({ HTMLAttributes: { class: 'test' } });
      expect(renderResult).toEqual(['span', { class: 'test' }, 0]);

      // Test addCommands
      const commands = fontSizeExtension.config.addCommands();
      const fakeCommands = {
        setMark: vi.fn(),
        unsetMark: vi.fn(),
      };
      
      commands.setFontSize('1.5rem')({ commands: fakeCommands });
      expect(fakeCommands.setMark).toHaveBeenCalledWith('fontSize', { fontSize: '1.5rem' });

      commands.unsetFontSize()({ commands: fakeCommands });
      expect(fakeCommands.unsetMark).toHaveBeenCalledWith('fontSize');
    });
  });

  describe('TipTapMinimal Component', () => {
    it('renders and responds to events with simplified toolbar', () => {
      const onChange = vi.fn();
      const { container } = render(<TipTapMinimal value="Hi" onChange={onChange} />);

      expect(screen.getByTestId('editor-content')).toBeInTheDocument();

      // Bold button
      const boldBtn = screen.getByTitle('Bold');
      fireEvent.click(boldBtn);
      expect(mockChain.toggleBold).toHaveBeenCalled();

      // Italic button
      const italicBtn = screen.getByTitle('Italic');
      fireEvent.click(italicBtn);
      expect(mockChain.toggleItalic).toHaveBeenCalled();

      // Bullet List button
      const bulletListBtn = screen.getByTitle('Bullet List');
      fireEvent.click(bulletListBtn);
      expect(mockChain.toggleBulletList).toHaveBeenCalled();

      // Ordered List button
      const orderedListBtn = screen.getByTitle('Ordered List');
      fireEvent.click(orderedListBtn);
      expect(mockChain.toggleOrderedList).toHaveBeenCalled();

      // Link prompt click
      const promptMock = vi.spyOn(window, 'prompt').mockReturnValue('https://google.com');
      const linkBtn = screen.getByTitle('Link');
      fireEvent.click(linkBtn);
      expect(mockChain.setLink).toHaveBeenCalledWith({ href: 'https://google.com' });

      // Unlink click
      const unlinkBtn = screen.getByTitle('Unlink');
      fireEvent.click(unlinkBtn);
      expect(mockChain.unsetLink).toHaveBeenCalled();

      // Color select and reset
      const colorInput = container.querySelector('input[type="color"]');
      fireEvent.input(colorInput, { target: { value: '#00ff00' } });
      expect(mockChain.setColor).toHaveBeenCalledWith('#00ff00');

      const resetBtn = screen.getByTitle('Reset Color');
      fireEvent.click(resetBtn);
      expect(mockChain.unsetColor).toHaveBeenCalled();

      // Font size select
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '1.5rem' } });
      expect(mockChain.setFontSize).toHaveBeenCalledWith('1.5rem');

      fireEvent.change(select, { target: { value: '' } });
      expect(mockChain.unsetFontSize).toHaveBeenCalled();

      promptMock.mockRestore();
    });

    it('handles link cancellation and empty link strings', () => {
      const promptMock = vi.spyOn(window, 'prompt');
      render(<TipTapMinimal value="Hi" onChange={() => {}} />);
      const linkBtn = screen.getByTitle('Link');

      // Cancel
      promptMock.mockReturnValue(null);
      fireEvent.click(linkBtn);
      expect(mockChain.setLink).not.toHaveBeenCalled();

      // Empty string
      promptMock.mockReturnValue('');
      fireEvent.click(linkBtn);
      expect(mockChain.unsetLink).toHaveBeenCalled();

      promptMock.mockRestore();
    });

    it('triggers onUpdate callback on editor content updates', () => {
      const onChange = vi.fn();
      render(<TipTapMinimal value="Hi" onChange={onChange} />);

      expect(capturedConfig).toBeDefined();

      // Update with new content
      mockEditor.getHTML.mockReturnValue('<p>New Minimal Content</p>');
      capturedConfig.onUpdate({ editor: mockEditor });
      expect(onChange).toHaveBeenCalledWith('<p>New Minimal Content</p>');

      // Update with empty content
      mockEditor.getHTML.mockReturnValue('<p></p>');
      capturedConfig.onUpdate({ editor: mockEditor });
      expect(onChange).toHaveBeenCalledWith('');

      // Update when destroyed (should ignore)
      onChange.mockClear();
      mockEditor.isDestroyed = true;
      capturedConfig.onUpdate({ editor: mockEditor });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('returns null when editor is not initialized', () => {
      mockEditor = null;
      const { container } = render(<TipTapMinimal value="Hi" onChange={() => {}} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
