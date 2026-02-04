#!/usr/bin/env node
/**
 * Script to run the interactive coaching session with predefined answers.
 * This simulates a user providing rich answers to the coaching questions.
 */

const { spawn } = require('child_process');
const path = require('path');

// Rich answers that provide specific names, times, metrics, and emotional moments
// We provide more answers to account for follow-up questions
const answers = [
  // Answer 1: The moment you realized something was wrong
  `It was 2:17am on a Tuesday - I remember because my phone screen burned into my half-asleep eyes. I'd gotten 6 alerts in 10 seconds. Sarah from platform had already pinged Slack: 'checkout is completely frozen, customers can't complete purchases.' My stomach dropped. This was two weeks before Black Friday - our biggest launch. Every minute down was potentially $50K in lost sales. I grabbed my laptop and didn't even wait for it to fully boot before I was typing.`,

  // Answer 2: Who you called / key decision
  `I made the call at 2:43am to implement a distributed lock using Redis rather than roll back to the monolith. Dev, our senior contractor who knew the legacy system inside out, pushed back hard. He said 'we should just roll back, this is too risky.' But I knew a rollback would take 72 hours minimum and we'd lose 4 months of migration progress. I told the team: 'If this doesn't work, it's on me. I'm making the call.' Marcus from the database team had the Redis lock deployed by 4:17am.`,

  // Answer 3: The hardest part / obstacle
  `The root cause was a race condition between our new order service and the legacy inventory system. When we'd carved out the order service three weeks earlier, we hadn't accounted for a specific edge case - when two orders for the same limited-stock item hit within 50 milliseconds, both services thought inventory was available. The legacy system used pessimistic locking, but our new service assumed eventual consistency. It took us 3 hours just to reproduce it locally because it only happened under load.`,

  // Answer 4: Counterfactual - what would have happened
  `If I had listened to Dev and rolled back, we would have missed our Q4 deadline completely. The business had already promised investors we'd have the microservices architecture live by January. More importantly, we would have lost the team's confidence - they'd been working 60-hour weeks for 4 months on this. And if we hadn't found the bug at 2am? Customers would have been double-charged on Black Friday. We estimated $500K in potential refunds and the PR nightmare that comes with it.`,

  // Answer 5: The metrics / quantified impact
  `We went from 2% service extraction to 78% within 6 months, touching all 500,000 lines of code in the monolith. Deployment time dropped from 4 hours to 12 minutes. Infrastructure costs fell 40% annually - about $180K saved. The incident runbook I wrote that night is still required reading for new engineers 18 months later. But the number I'm proudest of: zero customer-facing incidents during the entire migration. Not one.`,

  // Answer 6: The learning / growth
  `That 2am incident taught me that leadership under pressure isn't about having all the answers - it's about making the call when everyone's looking at you. Sarah messaged me the next morning: 'that was real leadership under fire.' That meant more than any metric. I learned that the best technical decisions often feel uncomfortable in the moment. If Dev had been right and the Redis fix had failed, my career could have taken a very different turn. But I trusted my understanding of the system and my team. That's the lesson I carry: own the decision, own the outcome.`,

  // Additional answers for follow-ups
  `Marcus was incredible under pressure. He didn't hesitate - he said 'I've got this' and within 90 minutes had not only implemented the lock but added monitoring so we could see every lock acquisition in real-time. That visibility gave us confidence the fix was working.`,

  `We used a load testing tool called Locust to simulate 1000 concurrent users hitting the checkout endpoint. It took us three attempts to get the conditions right - the race condition only appeared when we had specific timing between two inventory checks within that 50ms window.`,

  `The exhaustion by hour 72 was unlike anything I'd experienced. I remember Sarah brought coffee at 3am and we all just sat there in silence for five minutes, staring at our screens, waiting for the validation suite to complete.`,

  `The runbook came from everything we learned in those 72 hours. Every dead end, every hypothesis, every tool we used. I wrote it while the memories were fresh because I knew if this ever happened again, we couldn't afford to rediscover everything from scratch.`,
];

let answerIndex = 0;
let buffer = '';
let promptCount = 0;
const MAX_PROMPTS = 12; // Limit total prompts to prevent infinite loops

const child = spawn('npx', [
  'ts-node',
  'src/cli/story-coach/index.ts',
  'coach-generate',
  'src/cli/story-coach/test-data/migration-entry.json',
  '--output-dir',
  'src/cli/story-coach/test-output/interactive-migration-v2'
], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

child.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(text);
  buffer += text;

  // Check if we're at a "You:" prompt
  if (buffer.includes('You:')) {
    promptCount++;

    // Small delay to ensure prompt is fully rendered
    setTimeout(() => {
      if (answerIndex < answers.length) {
        const answer = answers[answerIndex];
        console.log(`\n[SENDING ANSWER ${answerIndex + 1}/${answers.length}]`);
        child.stdin.write(answer + '\n');
        answerIndex++;
      } else {
        // No more answers, send "done" to finish
        console.log(`\n[SENDING "done" - all answers provided]`);
        child.stdin.write('done\n');
      }
      buffer = ''; // Reset buffer
    }, 500);
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

child.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`);
  console.log(`Total prompts handled: ${promptCount}`);
  console.log(`Answers provided: ${answerIndex}`);
});

child.on('error', (err) => {
  console.error('Failed to start process:', err);
});

// Safety timeout after 5 minutes
setTimeout(() => {
  console.log('\n[TIMEOUT - sending done]');
  child.stdin.write('done\n');
}, 300000);
