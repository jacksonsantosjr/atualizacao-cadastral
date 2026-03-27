import { Database, ArrowRight } from 'lucide-react';

const Hero = ({ onAccess }) => {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-badge">
          <Database size={16} />
          <span>Tecnologia de Dados</span>
        </div>
        <h1 className="hero-title">
          Consulta Cadastral <br />
          <span className="text-gradient">Inteligente</span>
        </h1>
        <p className="hero-subtitle">
          Consulta massiva e automática de dados de fornecedores com processamento robusto aliado à precisão da inteligência artificial.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary btn-lg hero-btn" onClick={onAccess}>
            Acessar Ferramenta
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
