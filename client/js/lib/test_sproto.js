
const fs = require('fs');
const path = require('path');

// Mock window
global.window = {};

// Helper to load file in global scope
function load(filename) {
    const content = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    eval(content);
}

// Load sproto libs
load('sproto-parser.js');
load('sproto.js');

const Sproto = window.Sproto;

const schema = `
.package {
    type 0 : integer
    session 1 : integer
}
.User {
    id 0 : integer
    username 1 : string
}
login 1 {
    request {
        token 0 : string
    }
    response {
        ok 0 : boolean
        user 1 : User
    }
}
`;

const sproto = new Sproto(schema);
const host = sproto.host("package");
const request = host.attach(sproto);

// Create a packed message (Server -> Client)
// emulate response logic or just a raw pack
// Server sends:
// 1. Header (type=TAG/integer, session=integer)
// 2. Content (depends on type)

// Let's manually construct a buffer simulating what server sends.
// Or use sproto to pack it (assuming encode works).

// Scenario: Server sends a response.
// Header: type=null (response), session=1
// Content: User { id = <BIGINT>, username = "test" }

// 1. Pack header
const sessionID = 1234567890123456789n; // BigInt session
const headerObj = { type: null, session: sessionID };
// For response, type is missing/null?
// In .package: type 0 : integer. session 1 : integer.
// If type is missing, it's a response?
// Host.dispatch logic:
// this.headerTmp = sproto.decode("package", ...)
// if (this.headerTmp.type != null) -> REQUEST
// else -> RESPONSE

// So we construct a header with session but NO type.
// sproto.encode("package", { session: sessionID })

try {
    const headerBuf = sproto.encode("package", { session: sessionID });
    
    // 2. Pack content (User)
    // Suppose it's a response to login.
    // Response type: { ok: true, user: { id: BIGINT, username: "test" } }
    
    const userID = 999999999999999999n;
    const responseObj = {
        ok: true,
        user: {
            id: userID,
            username: "test"
        }
    };
    
    // "login" response type is anonymous struct defined in protocol
    // sproto.js stores it.
    // We need to access the response type for protocol 1 ("login").
    const proto = sproto.queryproto("login");
    const responseType = proto.response; // name of the response type
    
    const contentBuf = sproto.encode(responseType, responseObj);
    
    // 3. Merge
    const totalLen = headerBuf.length + contentBuf.length;
    const merged = new Uint8Array(totalLen);
    merged.set(headerBuf, 0);
    merged.set(contentBuf, headerBuf.length);
    
    // 4. Pack (Sproto pack)
    const packed = sproto.pack(merged);
    
    console.log("Dispatching...");
    // 5. Dispatch
    // We need to simulate that we have an attached session
    // dispatch() checks sessions map for RESPONSE.
    // host.sessions is internal. We can't easily set it without attaching.
    
    // We can manually set it if we can access it, but let's try to use public API.
    // host.attach returns a request function.
    // We call it to register the session.
    
    // request("login", { token: "abc" }, sessionID)
    // This returns a buffer (request packet), and internally registers sessionID -> proto.
    
    // Mock session storage in host
    // access private map?
    host.sessions.set(sessionID, proto);
    
    const result = host.dispatch(packed);
    console.log("Result:", result);
    
    // Check if BigInts are in result
    if (result.type === "RESPONSE") {
        console.log("User ID:", result.response.user.id, typeof result.response.user.id);
        console.log("Session:", result.session, typeof result.session);
    }

} catch (e) {
    console.error("Caught error:", e);
}

