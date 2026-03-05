import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useInventoryStore } from '../../store/inventoryStore';
import { useModalStackStore } from '../../store/modalStackStore';
import { BIOME_DISPLAY_NAMES, BIOME_COLORS, BiomeType } from '@into-the-void/shared-types';
import { GiShield, GiLightningFrequency, GiPoisonGas, GiCrossedSwords, GiTwoCoins } from 'react-icons/gi';
import { useCombatStore } from '../../store/combatStore';
import { useCombatLogStore } from '../../store/combatLogStore';
import { useShieldStore } from '../../store/shieldStore';
import { ActionBar } from './ActionBar';
import { CastBar } from './CastBar';
import { GameShortcuts } from './GameShortcuts';
import { TargetFrame } from './TargetFrame';
import { CombatLog } from './CombatLog';
import { BuffBar } from './BuffBar';
import { HazardIndicator } from './HazardIndicator';
import { CraftingIndicator } from './CraftingIndicator';
import './HUD.css';

export const HUD: React.FC<{ onMenuOpen?: () => void }> = ({ onMenuOpen }) => {
  const { player, zoneState, toggleQuestLog, showCombatLog, toggleCombatLog, showAutomation, toggleAutomation, showCrafting, toggleCrafting } = useGameStore();
  const { inventory } = useInventoryStore();
  const { inCombat } = useCombatStore();
  const { active: shieldActive, remaining: shieldRemaining, maxAbsorb: shieldMax } = useShieldStore();

  // Biome display with hysteresis to prevent flickering
  const [displayedBiome, setDisplayedBiome] = useState<BiomeType | null>(null);
  const lastBiomeRef = useRef<BiomeType | null>(null);
  const biomeStableCountRef = useRef(0);
  const HYSTERESIS_FRAMES = 3; // Require 3 consistent frames before updating

  useEffect(() => {
    if (!zoneState?.biome) return;

    const currentBiome = zoneState.biome;

    if (currentBiome === lastBiomeRef.current) {
      // Same biome, increment stability counter
      biomeStableCountRef.current++;
      if (biomeStableCountRef.current >= HYSTERESIS_FRAMES && displayedBiome !== currentBiome) {
        setDisplayedBiome(currentBiome);
      }
    } else {
      // Biome changed, reset counter
      lastBiomeRef.current = currentBiome;
      biomeStableCountRef.current = 1;
    }
  }, [zoneState?.biome, displayedBiome]);

  // Sync showCombatLog from gameStore to combatLogStore visible state
  useEffect(() => {
    useCombatLogStore.setState({ visible: showCombatLog });
  }, [showCombatLog]);

  // Wire L key to toggle combat log visibility, Q key for quest log
  // Guard: closing only works when that panel is the topmost modal; opening is unrestricted
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const top = useModalStackStore.getState().peek();

      if (key === 'l') {
        // Combat log: opening always allowed; closing only if it's topmost
        if (showCombatLog && top?.id === 'combat-log') {
          toggleCombatLog();
        } else if (!showCombatLog) {
          toggleCombatLog();
        }
      } else if (key === 'q') {
        // Quest log: opening always allowed; closing only if it's topmost
        const isOpen = useGameStore.getState().isQuestLogOpen;
        if (isOpen && top?.id === 'quest-log') {
          toggleQuestLog();
        } else if (!isOpen) {
          toggleQuestLog(); // QUEST-45: Q toggles quest log
        }
      } else if (key === 'j') {
        // Automation panel: opening always allowed; closing only if it's topmost
        const automationOpen = useGameStore.getState().showAutomation;
        if (automationOpen && top?.id === 'automation-panel') {
          toggleAutomation();
        } else if (!automationOpen) {
          toggleAutomation();
        }
      } else if (key === 'c') {
        // Crafting panel: opening always allowed; closing only if it's topmost
        const craftingOpen = useGameStore.getState().showCrafting;
        if (craftingOpen && top?.id === 'crafting-panel') {
          toggleCrafting();
        } else if (!craftingOpen) {
          toggleCrafting();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCombatLog, toggleQuestLog, toggleAutomation, toggleCrafting, showCombatLog, showAutomation, showCrafting]);

  if (!player) return null;

  const stats = inventory?.stats ?? {
    armor: 0,
    speedMultiplier: 1.0,
    hazardResistance: 0,
    detectionRange: 0,
    energyCapacity: 100,
    rechargeRate: 1.0,
    jumpHeight: 1.0,
    bonuses: {},
  };

  const healthPercent = (player.health / player.maxHealth) * 100;
  const energy = player.energy ?? 100;
  const maxEnergy = player.maxEnergy ?? 100;
  const energyPercent = (energy / maxEnergy) * 100;
  const xpPercent = (player.xp / player.xpToNextLevel) * 100;

  return (
    <div className="hud">
      <div className="hud-top-left">
        <div className="player-info">
          <div className="player-name">{player.name}</div>
          <div className="player-level">Lv. {player.level}</div>
        </div>
        <div className="health-bar">
          <div
            className="health-bar-fill"
            style={{ width: `${healthPercent}%` }}
          />
          <span className="health-text">
            {player.health} / {player.maxHealth}
          </span>
        </div>
        {shieldActive && shieldRemaining > 0 && (
          <div className="shield-bar">
            <div
              className="shield-bar-fill"
              style={{ width: `${(shieldRemaining / shieldMax) * 100}%` }}
            />
            <span className="shield-text">
              <GiShield style={{ marginRight: '4px', fontSize: '10px' }} />
              {shieldRemaining} / {shieldMax}
            </span>
          </div>
        )}
        <div className="energy-bar">
          <div
            className="energy-bar-fill"
            style={{ width: `${energyPercent}%` }}
          />
          <span className="energy-text">
            {energy} / {maxEnergy}
          </span>
        </div>
        <div className="xp-bar">
          <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
          <span className="xp-text">
            {player.xp} / {player.xpToNextLevel} XP
          </span>
        </div>
        <BuffBar />
        <div className="stats-section">
          <div className="stat-row">
            <GiShield className="stat-icon" title="Armor" />
            <span className="stat-value">{stats.armor}</span>
          </div>
          <div className="stat-row">
            <GiLightningFrequency className="stat-icon" title="Speed" />
            <span className="stat-value">{(stats.speedMultiplier * 100).toFixed(0)}%</span>
          </div>
          <div className="stat-row">
            <GiPoisonGas className="stat-icon" title="Hazard Resistance" />
            <span className="stat-value">{stats.hazardResistance}</span>
          </div>
        </div>
        <div className="credits-display">
          <GiTwoCoins className="credits-icon" title="Credits" />
          <span>{(player.credits ?? 0).toLocaleString()} cr</span>
        </div>
      </div>

      <CombatLog />

      <CastBar />
      <div className="hud-bottom-area">
        <div className="action-bars-container">
          <ActionBar barIndex={0} />
          <ActionBar barIndex={1} />
        </div>
        <GameShortcuts onMenuOpen={onMenuOpen} />
      </div>

      {displayedBiome && (
        <div className="biome-indicator">
          <span
            className="biome-dot"
            style={{ backgroundColor: BIOME_COLORS[displayedBiome] }}
          />
          <span className="biome-name">
            {BIOME_DISPLAY_NAMES[displayedBiome]}
            {zoneState?.fertilityType && ` (${zoneState.fertilityType})`}
          </span>
        </div>
      )}
      {zoneState?.zoneType === 'hub' && (
        <div className="safe-zone-indicator">
          <GiShield className="safe-zone-icon" />
          <span className="safe-zone-text">Safe Zone</span>
        </div>
      )}
      {inCombat && (
        <div className="combat-indicator">
          <GiCrossedSwords className="combat-indicator-icon" />
          <span className="combat-indicator-text">In Combat</span>
        </div>
      )}
      <HazardIndicator />
      <CraftingIndicator />
      <TargetFrame />
      <div className="hud-minimap" aria-label="Minimap" />
    </div>
  );
};
