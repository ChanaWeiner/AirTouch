import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "gdm-live-audio": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        // כאן את יכולה להוסיף מאפיינים (Props) ספציפיים אם הקומפוננטה מקבלת כאלו
        ref?: any; 
      };
    }
  }
}