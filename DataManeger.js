import fs from 'fs/promises';
import path from 'path';

// Function to read JSON file
const readJSON = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data); // Parse the JSON string into an object
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
};

// Function to write JSON file
const writeJSON = async (filePath, data) => {
  try {
    const jsonString = JSON.stringify(data, null, 2); // Pretty-print JSON
    await fs.writeFile(filePath, jsonString, 'utf-8');
  } catch (error) {
    console.error('Error writing file:', error);
    throw error;
  }
};

// Calculate the weight for each word
const calculateWeight = (word) => {
  return (word.times_correct / (word.consecutive_correct + 1)) * (1 + word.incorrect_count);
};

// Generate a unique id for a word based on the timestamp
const generateUniqueId = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14); // e.g., '20241220050000'
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0'); // Ensures it's always 3 digits
  const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // Adds a 3-digit random number
  return `${timestamp}${milliseconds}${randomPart}`;
};

// Check if a word hasn't been asked in the past 3 days
const isAskedInLast3Days = (lastAsked, currentTime) => {
  const lastAskedTime = new Date(lastAsked);
  const diffTime = currentTime - lastAskedTime;
  const threeDaysInMillis = 259200000; // 3 days in milliseconds
  return diffTime < threeDaysInMillis;
};

// Select the word to ask
const selectWordToAsk = async (jsonFilePath, currentTime) => {
  const data = await readJSON(jsonFilePath);
  const { words, last_asked_list } = data;

  // Filter out words that were asked in the last 10 questions
  const availableWords = words.filter(word => !last_asked_list.includes(word.word));

  // Separate words that haven't been asked in the last 3 days
  const wordsNotAskedIn3Days = availableWords.filter(word => !isAskedInLast3Days(word.last_asked, currentTime));

  let wordsToChooseFrom;

  if (wordsNotAskedIn3Days.length > 0) {
    // If there are words that haven't been asked in the last 3 days, prioritize them
    wordsToChooseFrom = wordsNotAskedIn3Days;
  } else {
    // If all words have been asked in the last 3 days, use all available words
    wordsToChooseFrom = availableWords;
  }

  // Calculate weights for all available words
  wordsToChooseFrom.forEach(word => {
    word.weight = calculateWeight(word);
  });

  // Sort the words by weight (descending order)
  wordsToChooseFrom.sort((a, b) => b.weight - a.weight);

  // Select the word with the highest weight
  const selectedWord = wordsToChooseFrom[0];

  // Update the last_asked_list (keep it to a length of 10)
  last_asked_list.push(selectedWord.word);
  if (last_asked_list.length > 2) {
    last_asked_list.shift(); // Remove the oldest element
  }

  // Update the word's last asked timestamp
  selectedWord.last_asked = currentTime.toISOString();

  // Write updated data back to the file
  await writeJSON(jsonFilePath, data);

  return selectedWord;
};

const getAllWords = async (jsonFilePath) => {
  try {
    const data = await readJSON(jsonFilePath);
    return data.words; // Return all the words in the database
  } catch (error) {
    console.error('Error retrieving words:', error);
    return []
  }
};


// Handle correct answer
const handleCorrectAnswer = async (jsonFilePath, wordId) => {
  const data = await readJSON(jsonFilePath);
  const word = data.words.find(w => w.id === wordId);

  if (word) {
    word.times_correct += 1;
    word.consecutive_correct += 1; // Increment consecutive correct count
    // Do not reset `incorrect_count`
    await writeJSON(jsonFilePath, data);
    return true
  } else {
    return false
  }
};

// Handle incorrect answer
const handleIncorrectAnswer = async (jsonFilePath, wordId) => {
  const data = await readJSON(jsonFilePath);
  const word = data.words.find(w => w.id === wordId);

  if (word) {
    word.consecutive_correct = 0; // Reset consecutive correct count
    word.incorrect_count += 1; // Increment incorrect count
    await writeJSON(jsonFilePath, data);
    return true
  } else {
    return false
  }
};

// Add a new word
const addWord = async (jsonFilePath, word, definition) => {

  
  try {
    const data = await readJSON(jsonFilePath);
    const newWord = {
      id: generateUniqueId(),
      word: word,
      definition,
      times_correct: 0,
      consecutive_correct: 0,
      incorrect_count: 0,
      last_asked: null, // Word has not been asked yet
    };
  
    data.words.push(newWord);
    await writeJSON(jsonFilePath, data);
    return newWord
    
  } catch (error) {
    return false   
  }
};

// Delete a word by ID
const deleteWord = async (jsonFilePath, wordId) => {
  const data = await readJSON(jsonFilePath);
  const wordIndex = data.words.findIndex(w => w.id === wordId);

  if (wordIndex !== -1) {
    const deletedWord = data.words.splice(wordIndex, 1); // Remove the word
    await writeJSON(jsonFilePath, data);
    return true
  } else {
    return false
  }
};

// Export the function to be used in another file
export {
  selectWordToAsk,
  getAllWords,
  handleCorrectAnswer,
  handleIncorrectAnswer,
  addWord,
  deleteWord,
};
