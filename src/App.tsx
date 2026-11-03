import { Scene } from './scene/Scene';
import { cuacaHari } from './sim/engine';
import { useGame } from './store';
import { CustomizeScreen } from './ui/CustomizeScreen';
import { EvictionScreen } from './ui/EvictionScreen';
import { MenuScreen } from './ui/MenuScreen';
import { PrepScreen } from './ui/PrepScreen';
import { ReportScreen } from './ui/ReportScreen';
import { SellingHud } from './ui/SellingHud';
import { ViralScreen } from './ui/ViralScreen';
import { ZoomButtons } from './ui/ZoomButtons';

export default function App() {
  const { screen, game, hasil, save, speed, selesaiJualan } = useGame();
  const live = screen === 'jualan';
  const lokasi = game?.lokasi ?? 0;
  const cuaca = (screen === 'jualan' || screen === 'laporan' || screen === 'viral') && hasil ? hasil.report.cuaca : game ? cuacaHari(game).prakiraan : 'cerah';
  const panel = screen === 'prep' || screen === 'kustom';

  return (
    <div className={`app screen-${screen} ${panel ? 'with-panel' : ''}`}>
      <div className="stage">
        <Scene
          lokasi={lokasi}
          cuaca={cuaca}
          asap={(game?.asapSisaHari ?? 0) > 0}
          events={live && hasil ? hasil.report.events : null}
          live={live}
          speed={speed}
          warna={save.kustom.warna}
          namaMenu={save.kustom.namaMenu || 'Es Kopi'}
          upgrade={game?.upgrade ?? {}}
          onSelesai={selesaiJualan}
        />
        {(screen === 'jualan' || screen === 'prep' || screen === 'kustom') && <ZoomButtons />}
      </div>

      {panel && <aside className="panel">{screen === 'prep' ? <PrepScreen /> : <CustomizeScreen />}</aside>}
      {screen === 'menu' && <MenuScreen />}
      {screen === 'jualan' && <SellingHud />}
      {screen === 'viral' && <ViralScreen />}
      {screen === 'laporan' && <ReportScreen />}
      {screen === 'gusur' && <EvictionScreen />}
    </div>
  );
}
