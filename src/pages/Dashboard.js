import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useAppState } from '../context/AppContext';
import { getTopMeals } from '../services/reportService';

function Dashboard() {
  const navigate = useNavigate();
  const { sales, customers } = useAppState();

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const todaySales = sales.filter((s) => s.date === today);
  const monthlySales = sales.filter((s) => s.date.startsWith(thisMonth));

  const todayTotal = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const monthlyTotal = monthlySales.reduce(
    (sum, s) => sum + (s.totalAmount || 0),
    0
  );

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const topMeals = getTopMeals(sales, 5);

  const statCards = [
    {
      label: "Today's Sales",
      value: `Nu ${todayTotal.toFixed(2)}`,
      sub: `${todaySales.length} transactions`,
      icon: <TodayIcon sx={{ fontSize: 40, opacity: 0.9 }} />,
      color: 'primary.main',
    },
    {
      label: 'Monthly Sales',
      value: `Nu ${monthlyTotal.toFixed(2)}`,
      sub: `${monthlySales.length} transactions`,
      icon: <CalendarMonthIcon sx={{ fontSize: 40, opacity: 0.9 }} />,
      color: 'success.main',
    },
    {
      label: 'Total Customers',
      value: customers.length,
      sub: 'Registered',
      icon: <PeopleIcon sx={{ fontSize: 40, opacity: 0.9 }} />,
      color: 'secondary.main',
    },
  ];

  return (
    <Box>
      <Grid container spacing={3} sx={{ mt: 0 }}>
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.label}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${card.color}08 0%, ${card.color}03 100%)`,
                border: '1px solid',
                borderColor: `${card.color}20`,
              }}
            >
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography color="text.secondary" variant="body2" fontWeight={600} gutterBottom>
                    {card.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ letterSpacing: '-0.02em' }}>
                    {card.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {card.sub}
                  </Typography>
                </Box>
                <Box sx={{ color: card.color }}>{card.icon}</Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Top Meals
                </Typography>
              </Box>
              {topMeals.length === 0 ? (
                <Box
                  sx={{
                    py: 6,
                    textAlign: 'center',
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="body2">No sales data yet</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    Complete a sale to see top meals
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {topMeals.map((m, i) => (
                    <Box
                      key={m.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.5,
                        borderBottom: i < topMeals.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography fontWeight={500}>
                        {i + 1}. {m.name}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {m.count} sold · Nu {m.revenue?.toFixed(2) || 0}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <ReceiptIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Recent Transactions
                </Typography>
              </Box>
              {recentSales.length === 0 ? (
                <Box
                  sx={{
                    py: 6,
                    textAlign: 'center',
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant="body2">No transactions yet</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                    Record your first sale to get started
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  {recentSales.map((sale) => (
                    <Box
                      key={sale.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1.5,
                        borderBottom: 1,
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2">
                        {sale.customerName || 'Walk-in'}
                      </Typography>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography fontWeight={600}>
                          Nu {(sale.totalAmount || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sale.date}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
