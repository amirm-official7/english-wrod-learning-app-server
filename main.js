import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config(); // Load .env variables

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Use the API key from .env
});
    

import express from 'express';
import cors from 'cors';


const app = express();
const port = process.env.PORT || 5001

import {
    selectWordToAsk,
    getAllWords,
    handleCorrectAnswer,
    handleIncorrectAnswer,
    addWord,
    deleteWord,
  } from './DataManeger.js';

app.use(express.json())    
app.use(cors());




// Basic route
app.get('/getallwords', (req, res) => {
    const jsonFilePath = './data.json';
    const currentTime = new Date();
    
    getAllWords(jsonFilePath)
      .then(words => {
        res.status(200).json(words)
      })
      .catch(error => {
        res.status(500).json({ success: false, message: 'Error selecting word' }); 
      });
});

app.get('/getnewword', (req, res) => {
    const jsonFilePath = './data.json';
    const currentTime = new Date();
    
    selectWordToAsk(jsonFilePath, currentTime)
      .then(selectedWord => {
        res.json(selectedWord)
      })
      .catch(error => {
        console.log(error);
        
        res.status(500).json({ success: false, message: 'Error selecting word' }); 
      });
});

app.post('/checkanswer', async (req, res) => {
    const { word, sentence } = req.body;

    try {
        const SystemInput = { 
            role: "system", 
            content: `Instruction:
When the user sends a message with the format:
word: "The_Word_That_He_Wrote_sentence_for", sentence: "The_Sentence_he_wrote"

Check for the following:
-Grammar Mistakes: Correct any common grammar mistakes, including subject-verb agreement, tense consistency, punctuation errors, and misspellings.

-Word Usage: Verify if the word in question is used correctly in the context of the sentence. If the word doesn’t fit the context, suggest a better alternative. Feel free to suggest advanced words (e.g., SAT-level vocabulary), but only when it's clearly an improvement. Avoid suggesting changes unless necessary for clarity or accuracy.

-Sentence Structure: Always check the sentence structure. If there's a grammatical structure issue (e.g., word order, awkward phrasing), provide a detailed explanation of why it’s incorrect and offer a corrected version of the sentence.

-Feedback Style: Provide educational feedback with a friendly, slightly casual tone. Aim to educate the user as if you're their teacher, but in an approachable manner. If appropriate, add a touch of humor or encouragement.

-Suggestions: For any suggestions, make sure you explain the reason behind the change. If the sentence is perfectly fine, simply confirm that and explain why no changes are necessary.

Example Input:
word: "loose", sentence: "I have loose the key."

Expected Output:
"Grammar Mistake: The sentence contains a grammatical error. The correct word is "lost" instead of "loose." "Loose" means something that is not tight, but here you need the past tense of 'lose.'
Corrected sentence: "I have lost the key."
Feedback: You're doing great! Just keep in mind that "loose" is a descriptive adjective, while "lost" is the verb you need here. Keep going!"
`
        }
        const UsersNewMessageObj = { 
            role: "user", 
            content: `word: "${word}", sentence: "${sentence}"`
        }
        const messages = [
            SystemInput, 
            UsersNewMessageObj
        ]
    
        
        let response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messages,
            temperature: 1,
            max_tokens: 2048,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        res.json(response)
        
    
    
    } catch (error) {
        res.status(500).json({ success: false, message: 'an error had occurred' }); 
    }
});


app.post('/chat', async (req, res) => {
    const { messages } = req.body;

    try {
        const SystemInput = { 
            role: "system", 
            content: `You are a helpful assistant that helps with grammar.`
        }

        const MessagesWithSystemInput = [
            SystemInput, 
            ...messages.map(message => ({
                role: message.role,// Assuming each message has a 'role' property (like 'user' or 'assistant')
                content: message.content})),
        ]
        
        let response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: MessagesWithSystemInput,
            temperature: 1,
            max_tokens: 2048,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        });

        res.json(response)

    } catch (error) {
        res.status(500).json({ success: false, message: 'an error had occurred' }); 
    }
});

app.post('/handlecorrectanswer', async (req, res) => {
    const { id } = req.body;
    const jsonFilePath = './data.json';


    handleCorrectAnswer(jsonFilePath, id).then(istrue => { 
        if (istrue){
            res.status(200).send("handled")
        } else { 
            res.status(500).send("word not found")
        }
    })
    
});

app.post('/handleincorrectanswer', async (req, res) => {
    const { id } = req.body;
    const jsonFilePath = './data.json';



    
    handleIncorrectAnswer(jsonFilePath, id).then(istrue => { 
        if (istrue){
            res.status(200).send("handled")
        } else { 
            res.status(500).send("word not found")
        }
    })
    
});

app.post('/addword', async (req, res) => {
    const { word } = req.body;
    const jsonFilePath = './data.json';

    if (word) {
        try {
            const SystemInput = { 
                role: "system", 
                content: `
You are an assistant helping English learners preparing for the SAT. The user will input a word in the format 'Word: THEWORDTHATWILLBEINSERTED'. Respond with the following:

1) List all possible meanings of the word in clear, non-advanced English.
2) Number each meaning (e.g., 1., 2., 3., etc.).
3) For each meaning, provide a basic synonym or a similar word.
4) For each meaning, include the closest Turkish word that matches that meaning.
Keep definitions concise yet slightly detailed, easy to understand, and helpful for improving vocabulary.`
            }
    
            const MessagesWithSystemInput = [
                SystemInput, 
                {role: "user", content: `Word: ${word}`}
            ]
            
            let response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: MessagesWithSystemInput,
                temperature: 1,
                max_tokens: 2048,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            });

            // console.log(response.choices[0].message.content);
            

            addWord(jsonFilePath, word, response.choices[0].message.content).then(istrue => { 
                if (istrue){
                    res.status(200).json(istrue)//if its true its the objet that has been added
                } else { 
                    res.status(500).send("word not found")
                }
            })
    
    
        } catch (error) {
            res.status(500).json({ success: false, message: 'an error had occurred' }); 
        }


    } else {
        res.status(500).send("you should include word")
    }
    
    
});

app.delete("/deleteword", (req, res) => {
    const { id } = req.body;
    const jsonFilePath = './data.json';



    
    deleteWord(jsonFilePath, id).then(istrue => { 
        if (istrue){
            res.status(200).send("handled")
        } else { 
            res.status(500).send("word not found")
        }
    })
    
})



// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});




