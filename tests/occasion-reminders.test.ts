import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  calculateDaysRemaining,
  getGiftSuggestionsForOccasion,
  generateOccasionWhatsAppLink,
  type OccasionType,
} from '../src/lib/occasionReminders';

test('Occasion Reminders - firestore.rules enforces owner-only access and schema constraints', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  // Match occasions subcollection under users/{userId}
  assert.match(rules, /match \/users\/\{userId\}[\s\S]*match \/occasions\/\{occasionId\}/);
  // Match owner check
  assert.match(rules, /allow read, delete: if isOwner\(userId\);/);
  // Match create/update keys constraint
  assert.match(rules, /hasOnly\(\['id', 'uid', 'recipientName', 'relationship', 'occasionType', 'customOccasion', 'date', 'notes', 'createdAt', 'updatedAt'\]\)/);
});

test('Occasion Reminders - calculateDaysRemaining calculates accurate annual recurrence', () => {
  const now = new Date();
  
  // Date today
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayResult = calculateDaysRemaining(todayStr, now);
  assert.equal(todayResult.daysRemaining, 0);
  assert.equal(todayResult.isThisWeek, true);

  // Date in 4 days
  const futureDate = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const futureStr = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
  const futureResult = calculateDaysRemaining(futureStr, now);
  assert.equal(futureResult.daysRemaining, 4);
  assert.equal(futureResult.isThisWeek, true);

  // Date in 10 days
  const laterDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  const laterStr = `${laterDate.getFullYear()}-${String(laterDate.getMonth() + 1).padStart(2, '0')}-${String(laterDate.getDate()).padStart(2, '0')}`;
  const laterResult = calculateDaysRemaining(laterStr, now);
  assert.equal(laterResult.daysRemaining, 10);
  assert.equal(laterResult.isThisWeek, false);

  // Past date from a previous year (e.g. birthday in 1995)
  // If birthday was yesterday, next one is in ~364 days
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const pastYearStr = `1990-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const pastResult = calculateDaysRemaining(pastYearStr, now);
  assert.ok(pastResult.daysRemaining >= 364 && pastResult.daysRemaining <= 366);
  assert.equal(pastResult.isThisWeek, false);
});

test('Occasion Reminders - getGiftSuggestionsForOccasion returns 3 curated links per occasion', () => {
  const occasions: OccasionType[] = ['birthday', 'wedding_anniversary', 'eid', 'other'];

  for (const occasion of occasions) {
    const suggestions = getGiftSuggestionsForOccasion(occasion, 'https://allbarka.com');
    assert.equal(suggestions.length, 3, `Expected 3 suggestions for occasion ${occasion}`);
    for (const sug of suggestions) {
      assert.ok(sug.title.length > 0);
      assert.ok(sug.description.length > 0);
      assert.ok(sug.url.startsWith('https://allbarka.com/'));
    }
  }
});

test('Occasion Reminders - generateOccasionWhatsAppLink formats safe concierge message and wa.me URL', () => {
  const { waUrl, message, suggestions } = generateOccasionWhatsAppLink(
    'Muhammad Taha',
    '0300 1234567',
    'Zainab',
    'spouse',
    'wedding_anniversary',
    3,
    '20 Nov 2026',
    'https://allbarka.com'
  );

  // wa.me format check
  assert.ok(waUrl.startsWith('https://wa.me/923001234567?text='));
  // URL encoded message check
  assert.ok(waUrl.includes(encodeURIComponent('Zainab')));
  assert.ok(waUrl.includes(encodeURIComponent('AllBarka')));

  // Plain message text check
  assert.ok(message.includes('Assalam-o-Alaikum Muhammad Taha!'));
  assert.ok(message.includes('Zainab'));
  assert.ok(message.includes('Shaadi ki Salgirah'));
  assert.ok(message.includes('3 din'));
  assert.equal(suggestions.length, 3);
  for (const s of suggestions) {
    assert.ok(message.includes(s.url));
  }
});
