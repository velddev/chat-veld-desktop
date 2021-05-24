import "../../style/editor.scss";

import Prism from "prismjs";
import "../../prismjs/languages/markdown";

import { client } from "../../api-client";
import { RootState } from "../../store";
import { Box, Flex, IconButton } from "@chakra-ui/react";
import React, { useCallback, useMemo, useState } from "react";
import { connect } from "react-redux";
import { FaPaperPlane } from "react-icons/fa";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import { createEditor, Text } from "slate";
import { SlateElement } from "./types";
import { serialize } from "./serializer";
import { createInputHandler } from "./inputHandler";
import { Leaf } from "./rendering/Leaf";
import { Channel } from "../../models";

interface Props {
  currentChannel?: Channel;
}

const initialState = (): SlateElement[] => [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];

const ChatBox = ({ currentChannel }: Props) => {
  const [value, setValue] = useState<SlateElement[]>(initialState());
  const editor = useMemo(() => withReact(createEditor()), []);
  const decorate = useCallback(([node, path]) => {
    const ranges = [];

    if (!Text.isText(node)) {
      return ranges;
    }

    const getLength = (token) => {
      if (typeof token === "string") {
        return token.length;
      } else if (typeof token.content === "string") {
        return token.content.length;
      } else {
        return token.content.reduce((l, t) => l + getLength(t), 0);
      }
    };

    const tokens = Prism.tokenize(node.text, Prism.languages.markdown);
    let start = 0;

    for (const token of tokens) {
      const length = getLength(token);
      const end = start + length;

      if (typeof token !== "string") {
        ranges.push({
          [token.type]: true,
          anchor: { path, offset: start },
          focus: { path, offset: end },
        });
      }

      start = end;
    }

    return ranges;
  }, []);

  const renderLeaf = useCallback((props) => {
    return <Leaf {...props} />;
  }, []);

  const sendMessage = async () => {
    const content = serialize(value).trim();
    if (content.length == 0) {
      return;
    }

    editor.selection = {
      anchor: { path: [0, 0], offset: 0 },
      focus: { path: [0, 0], offset: 0 },
    };
    setValue(initialState());

    await client().sendMessage(currentChannel?.id, content);
    ReactEditor.focus(editor);
  };

  const handleInput = createInputHandler(editor, {
    onSubmit: sendMessage,
  });

  return (
    <Flex
      w="full"
      mb="4"
      mt="-2"
      background="gray.500"
      borderRadius="lg"
      p="2"
      justifyContent="space-between"
      position="relative"
    >
      <Box flex="1" fontSize="sm" overflowX="hidden" whiteSpace="pre-wrap">
        <Slate
          editor={editor}
          value={value}
          onChange={(value: SlateElement[]) => setValue(value)}
        >
          <Editable
            placeholder={`Message `}
            decorate={decorate}
            renderLeaf={renderLeaf}
            onKeyDown={(e) => handleInput(e)}
          />
        </Slate>
      </Box>
      <IconButton
        size="xs"
        background="transparent"
        aria-label="send"
        icon={<FaPaperPlane />}
        onClick={sendMessage}
        zIndex="overlay"
      />
    </Flex>
  );
};

const mapStateToProps = (state: RootState): Props => {
  return {
    currentChannel: state.channels[state.channels.currentChannel],
  };
};

export default connect(mapStateToProps)(ChatBox);
