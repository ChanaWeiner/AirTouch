import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "gdm-live-audio": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: any; 
      };
    }
  }
}