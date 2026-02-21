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
import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

type MessageIds = 'noLegacyStatBuff';
type Options = [];

// Helper to get literal value from property
function getLiteralValue(node: TSESTree.Node): unknown {
  if (node.type === 'Literal') {
    return node.value;
  }
  return undefined;
}

// Helper to get property value from object
function getPropertyValue(props: TSESTree.ObjectLiteralElement[], key: string): unknown {
  for (const prop of props) {
    if (
      prop.type === 'Property' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === key
    ) {
      return getLiteralValue(prop.value);
    }
  }
  return undefined;
}

export const noLegacyStatBuff = ESLintUtils.RuleCreator.withoutDocs<Options, MessageIds>({
  create(context) {
    return {
      ObjectExpression(node: TSESTree.ObjectExpression) {
        const props = node.properties;

        // Check for type: 'stat_buff'
        const typeValue = getPropertyValue(props, 'type');
        if (typeValue !== 'stat_buff') return;

        // Check for duration: 0
        const durationValue = getPropertyValue(props, 'duration');
        if (durationValue !== 0) return;

        // This is a legacy stat_buff with duration: 0
        context.report({
          node,
          messageId: 'noLegacyStatBuff',
        });
      },
    };
  },
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow stat_buff with duration: 0 (use stats effect instead)',
    },
    messages: {
      noLegacyStatBuff:
        "Use 'stats' effect type instead of stat_buff with duration: 0. " +
        "Example: { type: 'stats', power: 5 } instead of { type: 'stat_buff', stat: 'power', amount: 5, duration: 0 }. " +
        "See Phase 59 documentation for migration guide.",
    },
    schema: [],
  },
  defaultOptions: [],
});

export default noLegacyStatBuff;
