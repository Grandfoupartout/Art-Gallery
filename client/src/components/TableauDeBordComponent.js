import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#FF6B6B', '#4CAF50'];

const TableauDeBordComponent = () => {
  const [stats, setStats] = useState({
    clientStats: [],
    venteStats: [],
    oeuvreStats: [],
    revenueStats: [],
    topArtistes: [],
    performanceData: []
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [clients, ventes, oeuvres, artistes] = await Promise.all([
        axios.get('http://localhost:5000/api/clients'),
        axios.get('http://localhost:5000/api/ventes'),
        axios.get('http://localhost:5000/api/oeuvres'),
        axios.get('http://localhost:5000/api/artistes')
      ]);

      processData(clients.data, ventes.data, oeuvres.data, artistes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const processData = (clients, ventes, oeuvres, artistes) => {
    // Statistiques clients par catégorie
    const clientCategories = clients.reduce((acc, client) => {
      acc[client.categorie] = (acc[client.categorie] || 0) + 1;
      return acc;
    }, {});

    // Statistiques ventes mensuelles
    const ventesParMois = ventes.reduce((acc, vente) => {
      const mois = new Date(vente.dateVente).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      acc[mois] = {
        count: (acc[mois]?.count || 0) + 1,
        revenue: (acc[mois]?.revenue || 0) + Number(vente.prixVente),
        commission: (acc[mois]?.commission || 0) + Number(vente.commission)
      };
      return acc;
    }, {});

    // Top artistes par ventes
    const artisteVentes = artistes.map(artiste => {
      const oeuvresArtiste = oeuvres.filter(o => o.idArtiste === artiste._id);
      const ventesArtiste = ventes.filter(v => 
        oeuvresArtiste.some(o => o._id === v.idOeuvre)
      );
      
      return {
        nom: artiste.nom,
        ventes: ventesArtiste.length,
        revenue: ventesArtiste.reduce((sum, v) => sum + Number(v.prixVente), 0)
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Performance mensuelle
    const performanceData = Object.entries(ventesParMois).map(([mois, data]) => ({
      mois,
      ventes: data.count,
      revenu: data.revenue,
      commission: data.commission
    }));

    // Statistiques des œuvres par statut
    const oeuvreStatuts = oeuvres.reduce((acc, oeuvre) => {
      acc[oeuvre.statut] = (acc[oeuvre.statut] || 0) + 1;
      return acc;
    }, {});

    setStats({
      clientStats: Object.entries(clientCategories).map(([name, value]) => ({
        name: name || 'Non catégorisé',
        value
      })),
      venteStats: performanceData,
      oeuvreStats: Object.entries(oeuvreStatuts).map(([name, value]) => ({
        name,
        value
      })),
      revenueStats: performanceData,
      topArtistes: artisteVentes,
      performanceData
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Tableau de Bord</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>
        {/* Répartition des clients */}
        <div className="chart-container">
          <h3>Répartition des Clients par Catégorie</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.clientStats}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {stats.clientStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Évolution des ventes */}
        <div className="chart-container">
          <h3>Évolution des Ventes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.venteStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="ventes" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenus et commissions */}
        <div className="chart-container">
          <h3>Revenus et Commissions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.revenueStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenu" stroke="#82ca9d" fill="#82ca9d" />
              <Area type="monotone" dataKey="commission" stroke="#ffc658" fill="#ffc658" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top artistes */}
        <div className="chart-container">
          <h3>Top 5 Artistes par Revenus</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.topArtistes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nom" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#8884d8" />
              <Bar dataKey="ventes" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Statuts des œuvres */}
        <div className="chart-container">
          <h3>Statuts des Œuvres</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.oeuvreStats}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {stats.oeuvreStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TableauDeBordComponent;
