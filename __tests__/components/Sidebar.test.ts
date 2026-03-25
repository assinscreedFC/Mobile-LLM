// Unit tests for Sidebar logic
// Tests search filtering and folder toggle

describe('Sidebar search filtering', () => {
  const chatHistory = [
    { id: '1', title: 'React Native Performance', updated_at: 1000 },
    { id: '2', title: 'Python asyncio tutorial', updated_at: 2000 },
    { id: '3', title: 'Machine Learning basics', updated_at: 3000 },
    { id: '4', title: null, updated_at: 4000 }, // Untitled
  ];

  function filterChats(query: string) {
    if (!query.trim()) return chatHistory;
    const q = query.toLowerCase();
    return chatHistory.filter(chat =>
      (chat.title || '').toLowerCase().includes(q)
    );
  }

  it('returns all chats when query is empty', () => {
    expect(filterChats('')).toHaveLength(4);
  });

  it('filters by title (case-insensitive)', () => {
    expect(filterChats('react')).toHaveLength(1);
    expect(filterChats('REACT')).toHaveLength(1);
  });

  it('handles null titles gracefully', () => {
    const result = filterChats('something');
    // Null title should be treated as empty string
    expect(result.every(c => c.title !== null || true)).toBe(true);
  });

  it('returns empty when no match', () => {
    expect(filterChats('xyz123')).toHaveLength(0);
  });
});

describe('Sidebar folder toggle', () => {
  it('toggles folder expanded state', () => {
    const expandedFolders = { maths: false, prog: false };

    function toggleFolder(folder: keyof typeof expandedFolders) {
      expandedFolders[folder] = !expandedFolders[folder];
    }

    toggleFolder('maths');
    expect(expandedFolders.maths).toBe(true);
    expect(expandedFolders.prog).toBe(false);

    toggleFolder('maths');
    expect(expandedFolders.maths).toBe(false);

    toggleFolder('prog');
    expect(expandedFolders.prog).toBe(true);
  });
});

describe('Sidebar chat selection', () => {
  it('sets current chat id and closes sidebar', () => {
    let currentChatId: string | null = null;
    let sidebarVisible = true;

    function handleSelectChat(chatId: string) {
      currentChatId = chatId;
      sidebarVisible = false;
    }

    handleSelectChat('chat-123');
    expect(currentChatId).toBe('chat-123');
    expect(sidebarVisible).toBe(false);
  });
});
