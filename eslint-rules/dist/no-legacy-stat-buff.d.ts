/**
 * ESLint rule: no-legacy-stat-buff
 *
 * Prevents use of stat_buff with duration: 0 pattern (deprecated in Phase 59).
 * Use 'stats' effect type instead for permanent equipment stat bonuses.
 *
 * Valid: { type: 'stats', power: 5, toughness: 10 }
 * Invalid: { type: 'stat_buff', stat: 'power', amount: 5, duration: 0 }
 *
 * Consumable buffs with duration > 0 are still valid.
 */
import { ESLintUtils } from '@typescript-eslint/utils';
export declare const noLegacyStatBuff: ESLintUtils.RuleModule<"noLegacyStatBuff", [], unknown, ESLintUtils.RuleListener>;
export default noLegacyStatBuff;
