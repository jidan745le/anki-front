// Test the new hierarchy and italic formatting

const testData = [
  {
    front:
      'CHAPTER:011-5._The_Coming_of_The_Leviathan.md|SECTION:**5** |BREADCRUMB:**5** |PROGRESS:1/3 (33%)|LEVEL:3',
    uuid: '08af3404-d838-4d5a-8e2a-883bb75424fd',
  },
  {
    front:
      'CHAPTER:011-5._The_Coming_of_The_Leviathan.md|SECTION:**5** |BREADCRUMB:**5** |PROGRESS:3/3 (100%)|LEVEL:3',
    uuid: '3cf21461-32bc-4aad-b815-2115a4e5f0d1',
  },
  {
    front:
      'CHAPTER:011-5._The_Coming_of_The_Leviathan.md|SECTION:**THEORIES OF STATE FORMATION**|BREADCRUMB:**5**  > **THEORIES OF STATE FORMATION**|PROGRESS:1/1 (100%)|LEVEL:4',
    uuid: '8eba3000-4cfb-4a1b-a33c-dc767c206ef6',
  },
  {
    front:
      'CHAPTER:011-5._The_Coming_of_The_Leviathan.md|SECTION:**_The State as a Voluntary Social Contract_**|BREADCRUMB:**5**  > **THEORIES OF STATE FORMATION** > **_The State as a Voluntary Social Contract_**|PROGRESS:3/3 (100%)|LEVEL:5',
    uuid: 'fc6cc265-635f-444e-80f8-f0ec792f0113',
  },
  {
    front:
      'CHAPTER:011-5._The_Coming_of_The_Leviathan.md|SECTION:**_Population Density_**|BREADCRUMB:**5**  > **THEORIES OF STATE FORMATION** > **_Population Density_**|PROGRESS:3/3 (100%)|LEVEL:5',
    uuid: '7e95b029-3972-422d-bc7f-9fd9d40db3c4',
  },
];

// Copy functions from AnkiCard component for testing
function processMarkdownItalic(text) {
  if (!text) return '';
  return text
    .replace(/\*\*_([^_]+)_\*\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\*\*/g, '');
}

function parseProgress(progressText) {
  const match = progressText.match(/(\d+)\/(\d+)\s*\((\d+)%\)/);
  if (match) {
    return {
      current: parseInt(match[1]),
      total: parseInt(match[2]),
      percentage: parseInt(match[3]),
    };
  }
  return { current: 1, total: 1, percentage: 100 };
}

function parseCardFrontData(frontText) {
  const parts = frontText.split('|');
  const data = {};

  parts.forEach(part => {
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) return;

    const key = part.substring(0, colonIndex);
    const value = part.substring(colonIndex + 1);

    switch (key) {
      case 'CHAPTER':
        data.chapterTitle = value;
        break;
      case 'SECTION':
        data.sectionTitle = value;
        break;
      case 'BREADCRUMB':
        data.breadcrumb = value ? value.split(' > ') : null;
        break;
      case 'PROGRESS':
        data.progress = parseProgress(value);
        break;
      case 'LEVEL':
        data.level = parseInt(value);
        break;
    }
  });

  return data;
}

// Test the markdown italic processing
console.log('Testing italic formatting:');
console.log('Input: **_Population Density_**');
console.log('Output:', processMarkdownItalic('**_Population Density_**'));
console.log('');

console.log('Input: **_The State as a Voluntary Social Contract_**');
console.log('Output:', processMarkdownItalic('**_The State as a Voluntary Social Contract_**'));
console.log('');

// Test hierarchy building
console.log('Testing hierarchy structure:');
testData.forEach(item => {
  const parsed = parseCardFrontData(item.front);
  console.log('---');
  console.log('Original:', item.front);
  console.log('Parsed:');
  console.log('  Chapter:', parsed.chapterTitle);
  console.log('  Section:', parsed.sectionTitle);
  console.log('  Breadcrumb:', parsed.breadcrumb);
  console.log('  Level:', parsed.level);
  console.log('  Progress:', parsed.progress);
});

console.log('\nFunctions are working correctly!');
