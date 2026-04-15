import { useState } from "react";
import Game from "./game/Game";
import Lobby from "./game/Lobby";

function App() {
  const [player, setPlayer] = useState(null);

  return (
    <>
      {!player ? (
        <Lobby onJoin={(data) => setPlayer(data)} />
      ) : (
        <Game player={player} />
      )}
    </>
  );
}

export default App;