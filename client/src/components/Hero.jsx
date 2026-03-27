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
          Atualização Cadastral <br />
          <span className="text-gradient">Inteligente</span>
        </h1>
        <p className="hero-subtitle">
          Potencialize seu processamento de fornecedores com nossa ferramenta de consulta massiva e resiliente. 
          Alta precisão com rodízio inteligente de 6 APIs.
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
