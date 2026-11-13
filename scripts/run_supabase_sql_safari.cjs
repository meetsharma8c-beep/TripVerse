// Script to inject combined SQL into Supabase SQL editor in Safari and click Run
const fs = require('fs');
const { execSync } = require('child_process');

const sqlPart1 = fs.readFileSync('supabase/expose_realtime_users.sql', 'utf8');
const sqlPart2 = fs.readFileSync('supabase/migrations/20261113_api_cache_and_ai_vector_engine.sql', 'utf8');

const combinedSql = `
-- =====================================================================
-- TRIPVERSE MASTER SUPABASE INFRASTRUCTURE DEPLOYMENT
-- 1. Real-Time User Access (auth.users & profiles)
-- 2. High-Speed 2-Tier API Cache (Weather, Wikimedia, Geoapify)
-- 3. pgvector & AI Itinerary Semantic Cache Engine
-- =====================================================================

${sqlPart1}

${sqlPart2}
`.trim();

console.log('Combined SQL length:', combinedSql.length, 'characters');

// Encode to JSON string for safe evaluation in Safari
const encoded = JSON.stringify(combinedSql);

const appleScript = `
tell application "Safari"
  set jsCode to "(() => {
    try {
      const models = window.monaco.editor.getModels();
      if (!models || models.length === 0) return { success: false, error: 'No Monaco editor found' };
      
      const sqlToRun = " & ${JSON.stringify(encoded)} & ";
      models[0].setValue(sqlToRun);

      // Find the Run button
      const allButtons = Array.from(document.querySelectorAll('button'));
      const runBtn = allButtons.find(b => {
        const text = (b.innerText || '').trim();
        return text.includes('Run') || text.includes('⌘↵');
      });

      if (!runBtn) return { success: false, error: 'Run button not found' };

      // Click the Run button
      runBtn.click();
      return { success: true, message: 'SQL injected and Run button clicked!' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  })()"
  
  do JavaScript jsCode in current tab of front window
end tell
`;

try {
  const result = execSync(`osascript -e ${JSON.stringify(appleScript)}`, { encoding: 'utf8' });
  console.log('Execution result:', result);
} catch (err) {
  console.error('AppleScript error:', err.message);
}
