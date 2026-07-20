on run
	set projPath to "/Users/mguec9382/Documents/GitHub/Projekt Scope ERP/Workshop- & Angebots-Kalkulations-Plattform"

	-- Node.js vorhanden?
	set hasNode to false
	try
		do shell script "command -v node || command -v /usr/local/bin/node || command -v /opt/homebrew/bin/node"
		set hasNode to true
	end try
	if hasNode is false then
		display alert "Node.js nicht gefunden" message "Bitte Node.js von nodejs.org installieren und die App erneut starten." buttons {"OK"} default button "OK"
		return
	end if

	tell application "Terminal"
		activate
		do script "cd " & quoted form of projPath & " && echo 'Workshop- & Angebots-Kalkulations-Plattform wird gestartet...' && lsof -ti tcp:5180 | xargs kill -9 2>/dev/null; if [ ! -d node_modules ]; then echo 'Abhaengigkeiten werden installiert...'; npm install || exit 1; fi; npm run dev"
	end tell
end run
