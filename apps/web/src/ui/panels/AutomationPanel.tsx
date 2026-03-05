import React, { useEffect } from 'react';
import { useAutomationStore } from '../../store/automationStore';
import { useGameStore } from '../../store/gameStore';
import { useModalStack } from '../../hooks/useModalStack';
import { useDraggablePanel } from '../../hooks/useDraggablePanel';
import { AUTOMATION_CONFIGS, type AutomationStructureType } from '@into-the-void/shared-types';
import { gameSocket } from '../../network/socket';
import { GiMining, GiRadarSweep, GiOilDrum, GiFireplace } from 'react-icons/gi';
import './AutomationPanel.css';

const TAB_CONFIG: { type: AutomationStructureType; label: string; icon: React.ReactNode }[] = [
  { type: 'extractor', label: 'Extractors', icon: <GiMining /> },
  { type: 'survey_beacon', label: 'Beacons', icon: <GiRadarSweep /> },
  { type: 'planetary_extractor', label: 'Planetary', icon: <GiOilDrum /> },
  { type: 'refinery', label: 'Refineries', icon: <GiFireplace /> },
];

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return '#44cc44';
    case 'depleted': return '#cccc44';
    case 'husk': return '#cc4444';
    default: return '#888888';
  }
}

function getFuelBarColor(fuelPercent: number): string {
  if (fuelPercent > 25) return '#44cc44';
  if (fuelPercent > 10) return '#cccc44';
  return '#cc4444';
}

export const AutomationPanel: React.FC = () => {
  const { structures, activeTab, setActiveTab, requestPanelUpdate } = useAutomationStore();
  const { toggleAutomation } = useGameStore();
  const { position, handleMouseDown } = useDraggablePanel();

  useModalStack('automation-panel', toggleAutomation);

  useEffect(() => {
    requestPanelUpdate();
  }, []);

  const filteredStructures = structures.filter(s => s.deployableType === activeTab);
  const config = AUTOMATION_CONFIGS[activeTab];
  const atMax = filteredStructures.length >= config.maxPerPlayer;

  const handleDeploy = () => {
    // Emit deploy event — for now, show a simple confirmation
    // Full placement mode (node highlighting, click-to-place) will be refined later
    const deployableItemId = `deployable_${activeTab}`;
    const player = useGameStore.getState().player;
    if (player) {
      // Emit deploy at player's current position
      gameSocket.emit('automation:deploy', {
        deployableItemId,
        position: { x: player.position.x, y: player.position.y, zoneId: player.position.zoneId },
      });
    }
  };

  return (
    <div
      className="panel automation-panel"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div className="automation-header" onMouseDown={handleMouseDown}>
        <span>Automation</span>
        <button className="close-btn" onClick={toggleAutomation}>X</button>
      </div>

      <div className="automation-tabs">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.type}
            className={`automation-tab ${activeTab === tab.type ? 'automation-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.type)}
            title={tab.label}
          >
            {tab.icon}
            <span className="automation-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="automation-content">
        {filteredStructures.length === 0 ? (
          <div className="automation-empty">
            No {config.displayName.toLowerCase()}s deployed
          </div>
        ) : (
          <div className="automation-structure-list">
            {filteredStructures.map(structure => {
              const fuelPercent = structure.maxFuel > 0
                ? (structure.fuelLevel / structure.maxFuel) * 100
                : 0;

              return (
                <div key={structure.deployableId} className="automation-structure-row">
                  <div className="automation-structure-info">
                    <div className="automation-structure-name">
                      <span
                        className="automation-status-dot"
                        style={{ backgroundColor: getStatusColor(structure.status) }}
                      />
                      {structure.name}
                    </div>
                    <div className="automation-structure-location">
                      {structure.position.zoneId}
                    </div>
                  </div>

                  <div className="automation-structure-stats">
                    <div className="automation-fuel-bar-container">
                      <div
                        className="automation-fuel-bar"
                        style={{
                          width: `${fuelPercent}%`,
                          backgroundColor: getFuelBarColor(fuelPercent),
                        }}
                      />
                    </div>
                    <div className="automation-structure-badges">
                      {structure.accumulatedCount > 0 && (
                        <span className="automation-count-badge">
                          {structure.accumulatedCount}
                        </span>
                      )}
                      <span className="automation-durability">
                        {structure.durabilityPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="automation-footer">
        <button
          className="automation-deploy-btn"
          disabled={atMax}
          onClick={handleDeploy}
          title={atMax ? `Maximum ${config.maxPerPlayer} reached` : `Deploy ${config.displayName}`}
        >
          {atMax ? `Max ${config.displayName}s Reached` : `Deploy New ${config.displayName}`}
        </button>
        <div className="automation-limit-text">
          {filteredStructures.length} / {config.maxPerPlayer}
        </div>
      </div>
    </div>
  );
};
