// CommonJS bootstrap wrapper for Phusion Passenger on Plesk / cPanel hosting
// Required because Phusion Passenger's Node.js loader uses require() which cannot load ES Modules (ERR_REQUIRE_ESM).
(async () => {
    try {
        await import('./SkinPeek.js');
    } catch (err) {
        console.error('[Phusion Passenger Loader] Fatal error while launching SkinPeek:', err);
        process.exit(1);
    }
})();
