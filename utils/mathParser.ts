export type Segment = { 
  type: 'text' | 'math'; 
  content: string; 
  isBlock: boolean 
};

export function segmentize(text: string): Segment[] {
  const regex = /(\$\$.*?\$\$|\$.*?\$)/gs;
  const parts = text.split(regex);
  
  // On ajoute ": Segment" ici pour forcer le type de retour de la boucle
  return parts.map((part): Segment => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return { 
        type: 'math', // TypeScript accepte maintenant car on a précisé ": Segment"
        content: part.slice(2, -2), 
        isBlock: true 
      };
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      return { 
        type: 'math', 
        content: part.slice(1, -1), 
        isBlock: false 
      };
    }
    return { 
      type: 'text', 
      content: part, 
      isBlock: false 
    };
  }).filter(s => s.content.length > 0);
}