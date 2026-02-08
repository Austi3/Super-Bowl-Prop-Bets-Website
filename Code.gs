/**
 * Super Bowl LX Prop Bets - Google Apps Script
 * Handles both player bet submissions and admin answer key updates
 */

// Configuration
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({result: "OK"}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const params = e.parameter;
    const type = params.type || 'bet';
    
    Logger.log("Received POST with type: " + type);
    Logger.log("Parameters: " + JSON.stringify(params));
    
    if (type === 'admin') {
      return handleAdminUpdate(params);
    } else if (type === 'lock') {
      return handleLockToggle(params);
    } else {
      return handleBetSubmission(params);
    }
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle admin answer key updates
 */
function handleAdminUpdate(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let answerSheet = ss.getSheetByName('AnswerKey');
  
  // Create AnswerKey sheet if it doesn't exist
  if (!answerSheet) {
    answerSheet = ss.insertSheet('AnswerKey');
    answerSheet.appendRow(['QuestionID', 'CorrectAnswer']);
  }
  
  // Clear existing answers (keep header)
  const lastRow = answerSheet.getLastRow();
  if (lastRow > 1) {
    answerSheet.getRange(2, 1, lastRow - 1, 2).clearContent();
  }
  
  // Collect all question answers from params
  const answers = [];
  for (const key in params) {
    // Skip the 'type' parameter
    if (key === 'type') continue;
    
    // Keys are like 'q1', 'q2', etc. - extract the question number
    const match = key.match(/^q(\d+)$/);
    if (match) {
      const questionNum = match[1];
      const answer = params[key];
      
      // Only add if answer is not empty
      if (answer && answer.trim() !== '') {
        answers.push([questionNum, answer]);
      }
    }
  }
  
  Logger.log("Answers to write: " + JSON.stringify(answers));
  
  // Sort by question number and write to sheet
  if (answers.length > 0) {
    answers.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    answerSheet.getRange(2, 1, answers.length, 2).setValues(answers);
    Logger.log("Successfully wrote " + answers.length + " answers to AnswerKey sheet");
  } else {
    Logger.log("No answers to write - params may be empty or malformed");
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    result: "success",
    action: "admin_updated",
    answersWritten: answers.length
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle player bet submissions
 */
function handleBetSubmission(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let responseSheet = ss.getSheetByName('Responses');
  
  // Create Responses sheet if it doesn't exist
  if (!responseSheet) {
    responseSheet = ss.insertSheet('Responses');
    responseSheet.appendRow(['Timestamp', 'Name', 'Email', 'Score', 'Answers']);
  }
  
  const timestamp = new Date().toLocaleString();
  const name = params.name || 'Anonymous';
  const email = params.email || '';
  const status = params.status || 'draft';
  
  // Collect all answers
  const answers = {};
  for (const key in params) {
    if (key.match(/^q\d+$/)) {
      answers[key] = params[key];
    }
  }
  
  // Check if user already submitted (update existing row)
  const data = responseSheet.getDataRange().getValues();
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === email) {
      existingRow = i + 1; // 1-indexed
      break;
    }
  }
  
  const answersJson = JSON.stringify({status: status, ...answers});
  
  if (existingRow > 0) {
    // Update existing row
    responseSheet.getRange(existingRow, 1).setValue(timestamp);
    responseSheet.getRange(existingRow, 2).setValue(name);
    responseSheet.getRange(existingRow, 5).setValue(answersJson);
  } else {
    // Append new row
    responseSheet.appendRow([timestamp, name, email, 0, answersJson]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    result: "success",
    action: "bet_submitted"
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle lock/unlock toggle
 */
function handleLockToggle(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName('Config');
  
  // Create Config sheet if it doesn't exist
  if (!configSheet) {
    configSheet = ss.insertSheet('Config');
    configSheet.appendRow(['Key', 'Value']);
  }
  
  const locked = params.locked === 'true';
  
  // Find existing submission_locked row or add new one
  const data = configSheet.getDataRange().getValues();
  let foundRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === 'submission_locked') {
      foundRow = i + 1;
      break;
    }
  }
  
  if (foundRow > 0) {
    configSheet.getRange(foundRow, 2).setValue(locked.toString());
  } else {
    configSheet.appendRow(['submission_locked', locked.toString()]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    result: "success",
    action: "lock_toggled",
    locked: locked
  })).setMimeType(ContentService.MimeType.JSON);
}
