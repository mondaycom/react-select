/** @jsx emotionJSX */
import { jsx as emotionJSX } from '@emotion/core';

import SyntaxHighlighter, {
  registerLanguage,
} from 'react-syntax-highlighter/prism-light';
import jsx from 'react-syntax-highlighter/languages/prism/jsx';
import { tomorrow } from 'react-syntax-highlighter/styles/prism';

const customTomorrow = {
  ...tomorrow,
  'code[class*="language-"]': {
    ...tomorrow['code[class*="language-"]'],
    fontFamily: null, // inherit from css
  },
  'pre[class*="language-"]': {
    ...tomorrow['pre[class*="language-"]'],
    fontFamily: null, // inherit from css
  },
};

registerLanguage('jsx', jsx);

export const Hr = () => (
  <div
    css={{
      backgroundColor: 'hsl(0, 0%, 90%)',
      height: 2,
      marginBottom: '2em',
      marginTop: '2em',
    }}
  />
);

export const Note = ({ Tag = 'div', ...props }) => (
  <Tag
    css={{
      color: 'hsl(0, 0%, 40%)',
      display: 'inline-block',
      fontSize: 12,
      fontStyle: 'italic',
      marginTop: '1em',
    }}
    {...props}
  />
);

export const H1 = props => <h1 css={{ marginTop: 0 }} {...props} />;
export const H2 = props => <h2 css={{ marginTop: '2em' }} {...props} />;

export const ColorSample = ({ name, color }) => (
  <div
    css={{
      display: 'inline-flex',
      marginBottom: '0.5em',
      alignItems: 'center',
      minWidth: '10em',
    }}
  >
    <span
      title={color}
      css={{
        marginRight: '0.5em',
        display: 'inline-block',
        borderRadius: 3,
        width: '1em',
        height: '1em',
        backgroundColor: color,
      }}
    />
    <Code>{name}</Code>
  </div>
);

// ==============================
// Code
// ==============================

export const Code = props => (
  <code
    css={{
      backgroundColor: 'rgba(38, 132, 255, 0.08)',
      // color: '#0747A6',
      fontSize: '85%',
      padding: '1px 5px 2px',
      borderRadius: 4,
    }}
    {...props}
  />
);

export const CodeBlock = ({ children, language, ...props }) => {
  return (
    <SyntaxHighlighter
      language={language}
      style={customTomorrow}
      customStyle={{
        borderRadius: 4,
        fontSize: 13,
        marginBottom: '1em',
        marginTop: '1em',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
      {...props}
    >
      {children}
    </SyntaxHighlighter>
  );
};
CodeBlock.defaultProps = { language: 'jsx' };
