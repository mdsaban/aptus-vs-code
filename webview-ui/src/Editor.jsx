import { useState, useEffect, useMemo, useRef } from "react";
import YooptaEditor, {
	generateId,
  createYooptaEditor,
  Elements,
  Blocks,
  useYooptaEditor,
} from "@yoopta/editor";

import Paragraph from "@yoopta/paragraph";
import Blockquote from "@yoopta/blockquote";
import Embed from "@yoopta/embed";
import Image from "@yoopta/image";
import Link from "@yoopta/link";
import Callout from "@yoopta/callout";
import Video from "@yoopta/video";
import File from "@yoopta/file";
import Accordion from "@yoopta/accordion";
import { NumberedList, BulletedList, TodoList } from "@yoopta/lists";
import {
  Bold,
  Italic,
  CodeMark,
  Underline,
  Strike,
  Highlight,
} from "@yoopta/marks";
import { HeadingOne, HeadingThree, HeadingTwo } from "@yoopta/headings";
import Code from "@yoopta/code";
import Table from "@yoopta/table";
import Divider, { DividerCommands } from "@yoopta/divider";
import ActionMenuList, {
  DefaultActionMenuRender,
} from "@yoopta/action-menu-list";
import Toolbar, { DefaultToolbarRender } from "@yoopta/toolbar";
import LinkTool, { DefaultLinkToolRender } from "@yoopta/link-tool";

import { WITH_BASIC_INIT_VALUE } from "./initValue";

const imagePlugin = Image.extend({
  options: {
    maxSizes: { maxWidth: "1000px", maxHeight: "1000px" },
    onUpload: async (file) => {
      const reader = new FileReader();
      let imageURL = null;

      reader.onload = () => {
        imageURL = reader.result;
      };

      reader.readAsDataURL(file);

      return new Promise((resolve) => {
        reader.onloadend = () => {
          resolve({
            src: imageURL,
            alt: file.name,
            sizes: {
              width: file.width,
              height: "auto",
            },
            fit: "contain",
          });
        };
      });
    },
  },
});
const plugins = [
  Paragraph,
  Table,
  Divider.extend({
    elementProps: {
      divider: (props) => ({
        ...props,
        color: "#007aff",
      }),
    },
  }),
  //   Accordion,
  HeadingOne,
  HeadingTwo,
  HeadingThree,
  Blockquote,
  // Callout,
  NumberedList,
  BulletedList,
  TodoList,
  Code,
  Link,
  // Embed,
  imagePlugin,
  // Video,
];

const TOOLS = {
  ActionMenu: {
    render: DefaultActionMenuRender,
    tool: ActionMenuList,
  },
  Toolbar: {
    render: DefaultToolbarRender,
    tool: Toolbar,
  },
  LinkTool: {
    render: DefaultLinkToolRender,
    tool: LinkTool,
  },
};

const MARKS = [Bold, Italic, CodeMark, Underline, Strike, Highlight];

function WithBaseFullSetup() {
  const editor = useMemo(() => createYooptaEditor(), []);
  const selectionRef = useRef(null);
	const [savedRawState, setSavedRawState] = useState(null);

  const addPastedImage = (imageURL) => {
    editor.insertBlock(
      {
        id: generateId(),
        value: [
          {
            id: generateId(),
            type: "image",
            children: [{ text: "" }],
            props: {
              nodeType: "void",
              src: imageURL,
              alt: "pasted image",
              srcSet: null,
              fit: "contain",
            },
          },
        ],
        type: "Image",
        meta: {
          order: 0,
          depth: 0,
          align: "left",
        },
      },
      { at: [editor.selection[0] + 1] }
    );
  };

  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          event.preventDefault(); // Block the default pasting in case of image
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          reader.onload = (e) => {
            addPastedImage(e.target.result);
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    const div = selectionRef.current;
    div.addEventListener("paste", handlePaste);

    return () => {
      div.removeEventListener("paste", handlePaste);
    };
  }, []);

	useEffect(() => {
		// Listen for messages from the extension
		const messageHandler = (event) => {
			const message = event.data;
			switch (message.command) {
				case 'savedState':
					setSavedRawState(message.savedState);
          editor.setEditorValue(message.savedState);
					break;
				// Handle other message types as needed
			}
		};

		window.addEventListener('message', messageHandler);

		return () => {
			window.removeEventListener('message', messageHandler);
		};
	}, []);

  function handleChange(value) {
    console.log("value", value);
    const event = new CustomEvent("saveData", { detail: { value } });
    window.dispatchEvent(event);
  }

  return (
    <div className="w-full px-2" ref={selectionRef}>
      {typeof savedRawState === 'object' && <YooptaEditor
        editor={editor}
        plugins={plugins}
        tools={TOOLS}
        marks={MARKS}
        selectionBoxRoot={selectionRef}
        value={savedRawState}
        className="!w-full"
        autoFocus
        onChange={handleChange}
      />}
    </div>
  );
}

export default WithBaseFullSetup;
