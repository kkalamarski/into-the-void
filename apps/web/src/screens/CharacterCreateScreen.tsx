import React from 'react';
import { Form, Link, redirect, useActionData, useNavigation } from 'react-router';
import { apiCall } from '../utils/api';
import '../styles/screens.css';
import '../styles/characters.css';

// Define factions with metadata (from world-bible.md lore)
const FACTIONS = [
  {
    id: 'verdant',
    name: 'Verdant Dynamics',
    color: '#44cc44',
    description: 'Sustainability is Profitability',
  },
  {
    id: 'helix',
    name: 'Helix Extraction',
    color: '#ff6b35',
    description: "Humanity's Survival Demands Sacrifice",
  },
  {
    id: 'nexus',
    name: 'Nexus Frontiers',
    color: '#00bfff',
    description: 'Connecting Worlds, Creating Opportunities',
  },
  {
    id: 'neutral',
    name: 'Unaffiliated',
    color: '#a0a0a0',
    description: 'Independent operators in the margins',
  },
];

// Action function for form submission
export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const faction = formData.get('faction') as string;

  try {
    await apiCall('/characters', {
      method: 'POST',
      body: JSON.stringify({ name, faction }),
    });
    // Redirect triggers loader revalidation on character-select
    return redirect('/character-select');
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create character',
    };
  }
}

// Character Create Screen Component
const CharacterCreateScreen: React.FC = () => {
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="screen">
      <div className="screen-card character-create-card">
        <h1 className="screen-title">Create Character</h1>
        <p className="screen-subtitle">Begin your journey into the void</p>

        {actionData?.error && (
          <div className="error-message">{actionData.error}</div>
        )}

        <Form method="post">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Character Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              pattern="^[a-zA-Z0-9_]{3,20}$"
              minLength={3}
              maxLength={20}
              title="3-20 characters (letters, numbers, underscores only)"
              required
              disabled={isSubmitting}
            />
            <div className="form-hint">
              3-20 characters (letters, numbers, underscores)
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Faction</label>
            <div className="faction-options">
              {FACTIONS.map((faction) => (
                <label key={faction.id} className="faction-card">
                  <input
                    type="radio"
                    name="faction"
                    value={faction.id}
                    className="faction-radio"
                    required
                    disabled={isSubmitting}
                  />
                  <div className="faction-card-content">
                    <div
                      className="faction-indicator"
                      style={{ backgroundColor: faction.color }}
                    />
                    <div className="faction-name">{faction.name}</div>
                    <div className="faction-description">
                      {faction.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Character...' : 'Create Character'}
          </button>
        </Form>

        <p className="screen-link">
          <Link to="/character-select">Back to Characters</Link>
        </p>
      </div>
    </div>
  );
};

export default CharacterCreateScreen;
