# Domain Pitfalls: Game Authentication & Character Management

**Domain:** Multiplayer game authentication with JWT + WebSocket
**Researched:** 2026-02-13
**Confidence:** MEDIUM (based on training data - no external verification available)

> **Note:** This research is based on training data without external verification due to tool limitations. All findings should be validated against current official documentation and security guidelines.

## Critical Pitfalls

Mistakes that cause security breaches, major rewrites, or catastrophic UX issues.

### Pitfall 1: Token Stored in localStorage Without XSS Protection
**What goes wrong:** JWT tokens stored in localStorage are vulnerable to XSS attacks. If any script injection vulnerability exists anywhere in your app (third-party libraries, user-generated content, etc.), attackers can steal tokens and impersonate users.

**Why it happens:** localStorage is convenient and persists across sessions, making it the default choice. Developers often don't realize that ANY JavaScript on the page can read localStorage.

**Consequences:**
- Account takeover attacks
- Stolen tokens can be used until expiration
- Mass exploitation if XSS vulnerability is found
- Compliance violations (GDPR, security standards)

**Prevention:**
1. Use httpOnly cookies for refresh tokens (JavaScript can't access them)
2. Short-lived access tokens in memory only (lost on page refresh - that's OK)
3. Implement strict CSP (Content Security Policy) headers
4. For localStorage: combine with additional security (token binding, fingerprinting)
5. Consider Token Binding if using localStorage (tie token to device fingerprint)

**Detection:**
- Security audit flags localStorage token storage
- Penetration testing reveals XSS → token theft chain
- No httpOnly cookie implementation in codebase

**Phase to address:** Phase 1 (Auth Foundation) - Architecture decision, costly to change later

---

### Pitfall 2: WebSocket Connection Before Token Validation
**What goes wrong:** Establishing WebSocket connection before validating JWT token allows unauthorized clients to consume server resources. Attackers can flood server with connections, causing DoS.

**Why it happens:** Developers establish WebSocket first, then send token as first message for convenience. This creates a window where unauthenticated connections exist.

**Consequences:**
- Resource exhaustion attacks
- Memory leaks from orphaned connections
- Server crash under load
- Legitimate users can't connect

**Prevention:**
1. Send JWT token as query parameter or header during WebSocket handshake
2. Validate token BEFORE upgrading HTTP → WebSocket
3. Reject connection immediately if token is invalid/missing
4. Implement connection rate limiting per IP
5. Use connection throttling with exponential backoff

**Example (NestJS):**
```typescript
// WRONG: Connect first, validate later
@WebSocketGateway()
handleConnection(client: Socket) {
  // Connection established, waiting for auth message
  client.on('authenticate', (token) => { /* validate */ });
}

// RIGHT: Validate during handshake
@WebSocketGateway()
handleConnection(client: Socket) {
  const token = client.handshake.auth.token;
  if (!this.validateToken(token)) {
    client.disconnect();
    return;
  }
}
```

**Detection:**
- WebSocket opens before receiving token
- No authentication in connection handler
- Token validation in separate message handler after connection

**Phase to address:** Phase 1 (Auth Foundation) - Core security pattern

---

### Pitfall 3: No Token Refresh Strategy
**What goes wrong:** Using only long-lived tokens OR forcing re-login when short-lived tokens expire. Long tokens = security risk. Frequent re-login = terrible UX.

**Why it happens:** Refresh token implementation is complex. Developers either avoid it (long tokens) or implement half-heartedly (force re-login).

**Consequences:**
- Long tokens: Stolen token valid for days/weeks
- Short tokens without refresh: User kicked out mid-game every 15 minutes
- Player frustration and churn
- Inability to revoke access quickly

**Prevention:**
1. Implement dual-token system:
   - Short-lived access token (5-15 min) sent with each request
   - Long-lived refresh token (7-30 days) in httpOnly cookie
2. Silent refresh before access token expires
3. Background refresh during gameplay (user never notices)
4. Fallback to re-login only when refresh token expires
5. Implement token revocation list for immediate access denial

**Detection:**
- Only one token type in codebase
- Token expiry > 1 hour with no refresh mechanism
- Users complain about being kicked out mid-game
- No background refresh logic

**Phase to address:** Phase 1 (Auth Foundation) - Changes authentication flow across entire app

---

### Pitfall 4: Character Selection State Not Synchronized with Server
**What goes wrong:** Client-side character selection/creation without server validation allows character duplication, invalid data, or race conditions when multiple tabs open.

**Why it happens:** Treating character select as "just UI" - fetching characters once, then managing selection purely client-side.

**Consequences:**
- Players create duplicate characters
- Exploits: Invalid character stats/items
- Race condition: Two tabs create same character name
- Corrupted game state when entering world
- Character data desync between client and server

**Prevention:**
1. Server is source of truth for ALL character operations
2. Character creation: POST to server, wait for confirmation, THEN update UI
3. Character selection: Send selected ID to server, validate ownership
4. Character list: Refresh from server on tab focus (detect stale data)
5. Optimistic UI updates + rollback on server rejection
6. Lock character during selection (prevent multi-tab issues)

**Detection:**
- Character state stored only in React state
- No server round-trip for character creation/selection
- Character creation using client-generated IDs
- No mechanism to detect stale character list

**Phase to address:** Phase 2 (Character Management) - Architectural decision that's hard to retrofit

---

### Pitfall 5: Game Connection Before Character Selection Validation
**What goes wrong:** Phaser game scene initializes and connects to game world before server confirms character selection is valid. Player appears in game world, then gets kicked out when validation fails.

**Why it happens:** Eager loading for perceived performance - start loading game assets immediately after character click.

**Consequences:**
- Player sees game world briefly, then gets kicked (confusing)
- Server resources wasted on invalid game sessions
- Exploit: Join game with character you don't own
- Race condition: Character deleted while loading game
- Complex error recovery in game scene

**Prevention:**
1. Sequential flow: Character select → Server validation → Game scene init
2. Loading screen during validation (set expectations)
3. Server returns "character token" or "session token" after validation
4. Game scene requires valid session token to start
5. Validate character ownership on every game action (defense in depth)

**Workflow:**
```
1. User clicks character
2. Show "Entering world..." loading screen
3. POST /game/join { characterId }
4. Server validates + returns session token
5. Initialize Phaser with session token
6. WebSocket connection with session token in handshake
```

**Detection:**
- Game scene starts immediately after character click
- No loading/validation step between selection and game
- Character ID sent directly to game without server validation
- Game connection can succeed with any character ID

**Phase to address:** Phase 2 (Character Management) - Affects game initialization sequence

---

### Pitfall 6: Token Expiry During Active Gameplay Not Handled
**What goes wrong:** Access token expires while player is in game, causing WebSocket disconnection or action rejection. Player loses progress or gets kicked without warning.

**Why it happens:** Developers test with long-lived tokens or short sessions, never experiencing mid-game expiry.

**Consequences:**
- Player loses unsaved progress
- Unexpected disconnection during critical moments (boss fight, PvP)
- Negative reviews and player churn
- Support tickets about "random disconnections"

**Prevention:**
1. Background token refresh while game is active
2. Check token expiry every N seconds during gameplay
3. Refresh token proactively 2-3 minutes before expiry
4. Grace period: Accept actions for 30s after expiry (during refresh)
5. Show "Connection issue" overlay if refresh fails
6. Pause gameplay during reconnection (don't continue simulation)
7. Test with 5-minute tokens in development

**Detection:**
- No token refresh logic in game scene
- WebSocket disconnects after token expiry time
- Players report random kicks at consistent intervals
- Token refresh only happens on user action, not automatically

**Phase to address:** Phase 3 (Game Integration) - Must be built into game loop

---

## Moderate Pitfalls

Serious issues that cause bugs or poor UX but don't require rewrites.

### Pitfall 7: No Loading States During Authentication
**What goes wrong:** Submit login form → nothing happens → suddenly logged in OR error appears. User doesn't know if click registered, clicks multiple times, triggers rate limiting.

**Prevention:**
1. Disable form submit button during request
2. Show spinner/loading indicator
3. Display progress for slow operations ("Verifying credentials...")
4. Prevent duplicate submissions
5. Timeout after 10-15 seconds with retry option

**Phase to address:** Phase 1 (Auth Foundation) - During screen implementation

---

### Pitfall 8: Error Messages Too Vague or Too Specific
**What goes wrong:**
- Too vague: "Login failed" (user doesn't know why)
- Too specific: "Password incorrect for user@email.com" (security risk - confirms email exists)

**Prevention:**
1. Login errors: "Invalid email or password" (don't reveal which)
2. Registration errors: Specific and helpful ("Password must be 8+ characters")
3. Network errors: "Connection failed. Check your internet connection."
4. Server errors: "Something went wrong. Please try again." + log detail server-side
5. Never expose stack traces or database errors to client

**Phase to address:** Phase 1 (Auth Foundation) - Error handling pattern

---

### Pitfall 9: Auth State Not Persisted Across Page Refresh
**What goes wrong:** User logs in, refreshes page, kicked back to login screen. Token exists in localStorage but app doesn't check it on load.

**Prevention:**
1. Check for token on app initialization
2. Validate token with server (is it still valid/not revoked?)
3. Restore auth state before rendering protected routes
4. Show loading screen during validation (don't flash login screen)
5. Handle expired token gracefully (attempt refresh first)

**Phase to address:** Phase 1 (Auth Foundation) - App initialization logic

---

### Pitfall 10: Character Name Validation Only Client-Side
**What goes wrong:** Client validates character name (length, characters), but server doesn't. Attacker bypasses client validation, creates character with malicious name (XSS payload, extremely long name, profanity, Unicode exploits).

**Prevention:**
1. Duplicate ALL validation server-side (never trust client)
2. Server validation is authoritative
3. Client validation for UX only (immediate feedback)
4. Sanitize and validate: length, allowed characters, profanity filter, unicode normalization
5. Check for name uniqueness server-side with proper locking

**Phase to address:** Phase 2 (Character Management) - During character creation API

---

### Pitfall 11: Multiple Tabs/Windows Not Handled
**What goes wrong:** User opens game in two tabs. Both connect to server with same token. Actions in one tab don't reflect in other. Character appears in two places. Server state corrupted.

**Prevention:**
1. Detect multiple tabs using BroadcastChannel API or localStorage events
2. Options:
   - Allow only one active tab (disconnect others with friendly message)
   - Sync state across tabs (complex, usually not worth it for games)
   - Different characters per tab (recommended)
3. Server: One active game session per character (last connection wins)
4. Show warning: "Game opened in another tab. This session will disconnect."

**Phase to address:** Phase 3 (Game Integration) - During WebSocket connection setup

---

### Pitfall 12: No Session Timeout After Inactivity
**What goes wrong:** Player walks away from computer with game open. Anyone can sit down and play as them. Long-lived sessions increase security risk.

**Prevention:**
1. Implement inactivity timeout (15-30 min for games)
2. Show "Are you still there?" modal before timeout
3. Return to character select (not full logout) for convenience
4. Track last activity timestamp (keyboard, mouse, game actions)
5. Pause game simulation during inactivity

**Phase to address:** Phase 3 (Game Integration) - During gameplay state management

---

## Minor Pitfalls

Issues that cause friction but are easy to fix.

### Pitfall 13: Password Requirements Too Strict or Too Weak
**What goes wrong:**
- Too weak: Accounts easily compromised
- Too strict: Users forget passwords, use password resets constantly, or store passwords insecurely

**Prevention:**
1. Reasonable requirements: 8+ characters, no complexity rules
2. Use password strength meter (visual feedback)
3. Block common passwords (top 10k list)
4. Allow password managers (no max length < 128 chars)
5. Consider passwordless options (magic links, OAuth)

**Phase to address:** Phase 1 (Auth Foundation) - Password validation logic

---

### Pitfall 14: No Visual Feedback for Token Expiry Warning
**What goes wrong:** Token expires silently. Next action fails. Player confused.

**Prevention:**
1. Show non-intrusive notification when token refreshed successfully
2. Show warning if refresh fails ("Reconnecting...")
3. Connection status indicator (green dot = connected, yellow = refreshing, red = disconnected)
4. Don't block gameplay unless absolutely necessary

**Phase to address:** Phase 3 (Game Integration) - UI component

---

### Pitfall 15: Character Limit Not Enforced or Displayed
**What goes wrong:** Players don't know how many characters they can create. Try to create another, get cryptic error "Limit reached."

**Prevention:**
1. Display "Characters: 3/5" in character select screen
2. Disable "Create Character" button when at limit
3. Show helpful message: "Character limit reached. Delete a character to create a new one."
4. Enforce limit server-side (never trust client)

**Phase to address:** Phase 2 (Character Management) - Character select UI

---

### Pitfall 16: No "Remember Me" Option
**What goes wrong:** Forcing re-login on every browser session annoys players. They'll use weak passwords or save in browser insecurely.

**Prevention:**
1. Optional "Remember me" checkbox
2. Checked: Refresh token lasts 30 days
3. Unchecked: Refresh token lasts session only
4. Clear distinction in UX

**Phase to address:** Phase 1 (Auth Foundation) - Login form

---

### Pitfall 17: Browser Back Button During Auth Flow Breaks State
**What goes wrong:** User on register screen → back → login screen → forward → register screen still has old data or broken state.

**Prevention:**
1. Use proper routing (React Router with history)
2. Clear form state on route change
3. Don't rely on component state that doesn't reset
4. Test back/forward button scenarios

**Phase to address:** Phase 1 (Auth Foundation) - Routing setup

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Auth Foundation | localStorage XSS vulnerability | Use httpOnly cookies + short-lived tokens in memory |
| Auth Foundation | No token refresh strategy | Implement dual-token system upfront |
| Auth Foundation | WebSocket connects before auth | Validate token during handshake, not after |
| Character Management | Client-side state as source of truth | Server validates all character operations |
| Character Management | Character selection not validated | Server round-trip before game init |
| Character Management | No uniqueness checks | Server-side validation with proper locking |
| Game Integration | Token expiry during gameplay | Background refresh in game loop |
| Game Integration | Multiple tabs not handled | Detect and disconnect duplicate sessions |
| Game Integration | No inactivity timeout | Track activity, timeout after 15-30 min |

---

## Security Checklist for Each Phase

### Phase 1: Auth Foundation
- [ ] Token storage strategy decided and documented
- [ ] Token refresh mechanism implemented
- [ ] WebSocket authentication in handshake (not post-connection)
- [ ] Rate limiting on auth endpoints
- [ ] HTTPS enforced (no token transmission over HTTP)
- [ ] CSP headers configured
- [ ] Error messages don't leak security info

### Phase 2: Character Management
- [ ] All character operations validated server-side
- [ ] Character creation requires server confirmation
- [ ] Character selection sends to server for validation
- [ ] Server is source of truth for character list
- [ ] Name validation server-side (sanitization, uniqueness)
- [ ] Character limit enforced server-side

### Phase 3: Game Integration
- [ ] Game scene waits for character validation
- [ ] Session token validated on game connection
- [ ] Background token refresh during gameplay
- [ ] Multiple tab detection implemented
- [ ] Inactivity timeout implemented
- [ ] Graceful disconnection handling

---

## Testing Recommendations

To catch these pitfalls early:

1. **Token Expiry Testing:** Set token lifetime to 2 minutes in development. Play for 10 minutes. Does it break?

2. **Multi-Tab Testing:** Open game in 3 tabs. Try different actions in each. Does state break?

3. **Network Interruption:** Use browser DevTools to throttle/block network mid-game. Does recovery work?

4. **Expired Token Injection:** Manually create expired JWT, try to use it. Is it properly rejected?

5. **XSS Testing:** Try injecting scripts in character names, chat messages. Are they sanitized?

6. **Concurrent Operations:** Two tabs create character with same name simultaneously. Race condition handled?

7. **Back Button Testing:** Navigate through auth flow using back/forward buttons. State broken?

---

## Confidence Assessment

**Overall Confidence: MEDIUM**

This research is based on training data about common web security patterns, JWT best practices, WebSocket security, and game authentication flows. Without access to external verification tools:

**High confidence areas:**
- XSS vulnerabilities with localStorage (well-documented security issue)
- Token refresh patterns (standard OAuth 2.0 practice)
- Server-side validation requirements (fundamental security principle)

**Medium confidence areas:**
- Specific NestJS WebSocket authentication patterns (framework-specific)
- Game-specific UX patterns (varies by game type)
- Optimal token lifetime values (context-dependent)

**Low confidence areas:**
- Current 2026 best practices (may have evolved since training cutoff)
- Specific library recommendations (versions may be outdated)

**Recommended validation:**
1. Review NestJS WebSocket authentication documentation for current patterns
2. Check OWASP guidelines for JWT storage and validation
3. Review Socket.io security best practices (if using that library)
4. Consult game-specific security resources (GDC talks, game security blogs)

---

## Sources

**NOTE:** No external sources were consulted due to tool limitations. All findings are based on training data (cutoff: January 2025) covering:
- OWASP security guidelines
- JWT/OAuth 2.0 specifications
- WebSocket security patterns
- General web application security principles
- Game development security discussions

**Recommended authoritative sources to verify findings:**
- OWASP JWT Security Cheat Sheet
- NestJS WebSocket authentication documentation
- RFC 6749 (OAuth 2.0)
- Game Developer Conference (GDC) security talks
- Socket.io authentication documentation

All findings should be validated against current official documentation before implementation.
