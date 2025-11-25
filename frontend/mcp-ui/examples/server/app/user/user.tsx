import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { postMessageToParent } from '../utils/messageUtils';

interface UserInfo {
  id: string;
  name: string;
  avatarUrl: string;
  location?: string;
}

export function User({ user }: { user: UserInfo }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const taskCounts = [80, 140, 110, 170, 95, 155];
  const data = months.map((m, i) => ({ month: m, tasks: taskCounts[i] }));

  const avg = Math.round(taskCounts.reduce((sum, v) => sum + v, 0) / taskCounts.length);
  const reachPct = Math.round((taskCounts[taskCounts.length - 1] / Math.max(...taskCounts)) * 100);

  const handleNudge = () => {
    if (user.id) {
      const message = {
        type: 'tool',
        payload: {
          toolName: 'nudge_team_member',
          params: {
            name: user.name,
          },
        },
      };
      postMessageToParent(message);
    }
  };

  const handleAskChat = (taskTitle: string) => {
    const message = {
      type: 'prompt',
      payload: {
        prompt: `How do I ${taskTitle}?`,
      },
    };
    postMessageToParent(message);
  };

  return (
    <div style={styles.card}>
      {/* header */}
      <div style={styles.header}>
        <img src={user.avatarUrl} alt={`${user.name}’s avatar`} style={styles.avatar} />
        <div>
          <h2 style={styles.name}>{user.name}</h2>
          {user.location && <div style={styles.location}>{user.location}</div>}
        </div>
      </div>

      {/* performance overview */}
      <div style={{ padding: '0 16px', width: '100%' }}>
        <h3 style={styles.sectionTitle}>Performance Overview</h3>
        <div style={styles.statsRow}>
          <div>
            <span style={styles.statLabel}>Average&nbsp;</span>
            <span style={styles.statValueGreen}>{avg}</span>
          </div>
          <div>
            <span style={styles.statLabel}>Reach&nbsp;</span>
            <span style={styles.statValueRed}>{reachPct}%</span>
          </div>
        </div>
        <div style={{ height: 120, width: '100%' }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1976d2" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#1976d2" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: '#666' }} />
              <YAxis hide domain={[0, 'dataMax + 20']} />
              <Tooltip
                contentStyle={{ borderRadius: 8 }}
                formatter={(value: number) => [`${value}`, 'Tasks']}
              />
              <Area
                type="monotone"
                dataKey="tasks"
                stroke="#1976d2"
                fill="url(#colorTasks)"
                strokeWidth={2}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* summary tiles */}
      <div style={styles.tiles}>
        {[
          { label: 'Completed', value: 1243, gradient: ['#FF8A65', '#FF7043'] },
          { label: 'Pending', value: 289, gradient: ['#4FC3F7', '#29B6F6'] },
          { label: 'Blocked', value: 67, gradient: ['#E57373', '#EF5350'] },
        ].map((tile) => (
          <div
            key={tile.label}
            style={{
              ...styles.tile,
              background: `linear-gradient(135deg, ${tile.gradient[0]}, ${tile.gradient[1]})`,
            }}
          >
            <div style={styles.tileValue}>{tile.value}</div>
            <div style={styles.tileLabel}>{tile.label}</div>
          </div>
        ))}
      </div>

      {/* blocked tasks */}
      <div style={styles.blockedSection}>
        <h3 style={styles.sectionTitle}>Blocked Tasks</h3>
        <div style={styles.tasksList}>
          {[
            {
              id: 1,
              title: 'Add a route to React Router app',
              priority: 'High',
            },
            {
              id: 2,
              title: 'Fix database connection timeout issue',
              priority: 'Medium',
            },
            {
              id: 3,
              title: 'Turn on Vision Mode in Playwright MCP',
              priority: 'High',
            },
          ].map((task) => (
            <div key={task.id} style={styles.taskItem}>
              <div style={styles.taskContent}>
                <div style={styles.taskPriority}>
                  <span
                    style={{
                      ...styles.priorityBadge,
                      ...(task.priority === 'High' ? styles.priorityHigh : styles.priorityMedium),
                    }}
                  >
                    {task.priority}
                  </span>
                </div>
                <div style={styles.taskTitle}>{task.title}</div>
              </div>
              <button style={styles.askChatButton} onClick={() => handleAskChat(task.title)}>
                Ask Chat
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* nudge button */}
      <button onClick={handleNudge} style={styles.button}>
        Nudge
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    // maxWidth: 500,
    borderRadius: 8,
    background: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    background: '#E3F2FD',
    color: '#1E88E5',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #fff',
  },
  name: {
    margin: 0,
    fontSize: '1.2rem',
  },
  location: {
    fontSize: '0.85rem',
    opacity: 0.85,
  },
  sectionTitle: {
    margin: '16px 0 4px',
    fontSize: '1rem',
    color: '#333',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: 8,
    fontSize: '0.9rem',
  },
  statLabel: {
    color: '#555',
  },
  statValueGreen: {
    color: '#388E3C',
    fontWeight: 600,
  },
  statValueRed: {
    color: '#D32F2F',
    fontWeight: 600,
  },
  tiles: {
    display: 'flex',
    gap: 8,
    padding: '16px',
  },
  tile: {
    flex: 1,
    borderRadius: 6,
    padding: 12,
    color: '#fff',
    textAlign: 'center' as const,
  },
  tileValue: {
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  tileLabel: {
    fontSize: '0.85rem',
    marginTop: 4,
  },
  button: {
    width: '100%',
    padding: '10px 0',
    border: 'none',
    background: '#BBDEFB',
    color: '#1565C0',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  blockedSection: {
    padding: '0 16px',
    borderTop: '1px solid #f0f0f0',
    paddingTop: 16,
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    marginBottom: 16,
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    background: '#FAFAFA',
    borderRadius: 6,
    border: '1px solid #E0E0E0',
  },
  taskContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row' as const,
    gap: 4,
  },
  taskTitle: {
    fontSize: '0.9rem',
    color: '#333',
    fontWeight: 500,
  },
  taskPriority: {
    display: 'flex',
    alignItems: 'center',
  },
  priorityBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: 3,
    textTransform: 'uppercase' as const,
  },
  priorityHigh: {
    background: '#FFEBEE',
    color: '#C62828',
    marginRight: '30px',
  },
  priorityMedium: {
    background: '#FFF3E0',
    color: '#E65100',
    marginRight: '10px',
  },
  askChatButton: {
    padding: '6px 12px',
    border: 'none',
    background: '#E3F2FD',
    color: '#1976D2',
    fontSize: '0.8rem',
    fontWeight: 500,
    borderRadius: 4,
    cursor: 'pointer',
    marginLeft: 12,
  },
};
