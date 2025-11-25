import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { postMessageToParent } from '../utils/messageUtils';

interface TaskDetails {
  remaining: number;
  toDo: number;
  inProgress: number;
  blocked: number;
}

type TeamMemberId = 'alice' | 'bob' | 'charlie';

interface TeamMemberInfo {
  id: TeamMemberId;
  name: string;
  color: string;
  gradientId: string;
  avatarUrl: string;
}

interface SprintDayDataEntry {
  date: string;
  alice: TaskDetails;
  bob: TaskDetails;
  charlie: TaskDetails;
  [key: string]: TaskDetails | string;
}

interface ProcessedChartItemFullView {
  date: string;
  toDo: number;
  inProgress: number;
  blocked: number;
}

interface ProcessedChartItemZoomedView {
  teamMemberId: TeamMemberId;
  teamMemberName: string;
  toDo: number;
  inProgress: number;
  blocked: number;
  originalColor: string;
}

const teamMembers: TeamMemberInfo[] = [
  {
    id: 'alice',
    name: 'Alice',
    color: '#26A69A',
    gradientId: 'gradAlice',
    avatarUrl: '/avatar1.png',
  },
  {
    id: 'bob',
    name: 'Bob',
    color: '#42A5F5',
    gradientId: 'gradBob',
    avatarUrl: '/avatar2.png',
  },
  {
    id: 'charlie',
    name: 'Charlie',
    color: '#D32F2F',
    gradientId: 'gradCharlie',
    avatarUrl: '/avatar3.png',
  },
];

const statusMeta = {
  toDo: { name: 'To Do', color: '#B0BEC5' }, // Light Grey/Blue - Neutral
  inProgress: { name: 'In Progress', color: '#FFCA28' }, // Amber - Active
  blocked: { name: 'Blocked', color: '#EF5350' }, // Soft Red - Urgent
};
const statusKeys = ['toDo', 'inProgress', 'blocked'] as const;

// Original full sprint data
const sprintDataFull: SprintDayDataEntry[] = [
  {
    date: '5/10',
    alice: { remaining: 8, toDo: 3, inProgress: 3, blocked: 2 },
    bob: { remaining: 7, toDo: 2, inProgress: 3, blocked: 2 },
    charlie: { remaining: 9, toDo: 4, inProgress: 3, blocked: 2 },
  },
  {
    date: '5/11',
    alice: { remaining: 7, toDo: 2, inProgress: 3, blocked: 2 },
    bob: { remaining: 6, toDo: 2, inProgress: 2, blocked: 2 },
    charlie: { remaining: 8, toDo: 3, inProgress: 3, blocked: 2 },
  },
  {
    date: '5/12',
    alice: { remaining: 9, toDo: 3, inProgress: 4, blocked: 2 },
    bob: { remaining: 8, toDo: 3, inProgress: 3, blocked: 2 },
    charlie: { remaining: 10, toDo: 4, inProgress: 4, blocked: 2 },
  },
  {
    date: '5/13',
    alice: { remaining: 6, toDo: 1, inProgress: 2, blocked: 3 },
    bob: { remaining: 9, toDo: 3, inProgress: 3, blocked: 3 },
    charlie: { remaining: 11, toDo: 5, inProgress: 3, blocked: 3 },
  },
  {
    date: '5/14',
    alice: { remaining: 10, toDo: 4, inProgress: 3, blocked: 3 },
    bob: { remaining: 9, toDo: 3, inProgress: 3, blocked: 3 },
    charlie: { remaining: 12, toDo: 5, inProgress: 4, blocked: 3 },
  },
  {
    date: '5/15',
    alice: { remaining: 11, toDo: 4, inProgress: 4, blocked: 3 },
    bob: { remaining: 10, toDo: 3, inProgress: 4, blocked: 3 },
    charlie: { remaining: 13, toDo: 6, inProgress: 4, blocked: 3 },
  },
  {
    date: '5/16',
    alice: { remaining: 12, toDo: 5, inProgress: 4, blocked: 3 },
    bob: { remaining: 18, toDo: 11, inProgress: 4, blocked: 3 },
    charlie: { remaining: 14, toDo: 6, inProgress: 5, blocked: 3 },
  },
];

// Process data for the full view (stacked by STATUS, grouped by date)
const originalProcessedDataFullView: ProcessedChartItemFullView[] = sprintDataFull.map((day) => {
  let dayTotalToDo = 0;
  let dayTotalInProgress = 0;
  let dayTotalBlocked = 0;
  teamMembers.forEach((member) => {
    dayTotalToDo += day[member.id]?.toDo || 0;
    dayTotalInProgress += day[member.id]?.inProgress || 0;
    dayTotalBlocked += day[member.id]?.blocked || 0;
  });
  return {
    date: day.date,
    toDo: dayTotalToDo,
    inProgress: dayTotalInProgress,
    blocked: dayTotalBlocked,
  };
});

// Mapping statuses to team member gradients for the full view bar colors
const fullViewStatusToGradientMapping: Record<(typeof statusKeys)[number], string> = {
  toDo: teamMembers[0].gradientId, // Alice's gradient (Teal)
  inProgress: teamMembers[1].gradientId, // Bob's gradient (Blue)
  blocked: teamMembers[2].gradientId, // Charlie's gradient (Red)
};

// --- Custom Rounded Bar Shape (used for both views) ---
const RoundedBar = (props: {
  fill: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  // Reverted to any to match recharts expectations for now
  const { fill, x, y, width, height } = props;
  // Use the existing radius calculation. This radius will be applied to all four corners.
  const radius = Math.min(Math.abs(width), Math.abs(height)) / 6;

  if (height === 0) return <g />;

  // Fallback for very small bars where path calculations might lead to visual glitches.
  // This condition remains the same.
  if (Math.abs(height) < radius * 1.5 || Math.abs(width) < radius * 1.5) {
    return <rect x={x} y={y} width={width} height={height} fill={fill} />;
  }

  if (height < 0) {
    // Handle negative values - path unchanged as not currently used and not specified in request
    const absHeight = Math.abs(height);
    // This existing path rounds the two corners at the "bottom" (y + absHeight) of the negative bar.
    // For full consistency, if negative bars were used and needed all 4 corners rounded, this would also need changing.
    const path = `
      M ${x},${y}
      L ${x + width},${y}
      A ${radius},${radius} 0 0 0 ${x + width - radius},${y + absHeight}
      L ${x + radius},${y + absHeight}
      A ${radius},${radius} 0 0 0 ${x},${y}
      Z
    `;
    return <path d={path} fill={fill} />;
  }

  const path = `
    M ${x + radius},${y}
    L ${x + width - radius},${y}
    A ${radius},${radius} 0 0 1 ${x + width},${y + radius}
    L ${x + width},${y + height - radius}
    A ${radius},${radius} 0 0 1 ${x + width - radius},${y + height}
    L ${x + radius},${y + height}
    A ${radius},${radius} 0 0 1 ${x},${y + height - radius}
    L ${x},${y + radius}
    A ${radius},${radius} 0 0 1 ${x + radius},${y}
    Z
  `;
  return <path d={path} fill={fill} />;
};

// --- Custom Tooltip ---
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string; // Status name like "To Do", "In Progress", "Blocked"
    value: number; // Count for that status
    color?: string; // Bar segment color (e.g., from 'fill' prop of Bar)
    dataKey?: (typeof statusKeys)[number]; // 'toDo', 'inProgress', 'blocked'
    payload?: any; // The raw data item for the bar
  }>;
  label?: string; // Date in full view, teamMemberName in zoomed view
  isZoomedView: boolean; // Manually passed prop
}

const CustomTooltip = ({ active, payload, label, isZoomedView }: CustomTooltipProps) => {
  if (active && payload && payload.length && label) {
    const commonStyle = {
      backgroundColor: 'rgba(40, 40, 40, 0.92)',
      padding: '10px 14px',
      border: 'none',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      fontSize: '13px',
      color: '#FFFFFF',
      minWidth: '150px',
    };

    if (isZoomedView) {
      // Zoomed-in view: label is teamMemberName
      // Payload contains { name: "Status Name", value: count, dataKey: "statusKey" } for that team member
      const teamMemberName = label;

      return (
        <div style={commonStyle}>
          <p
            style={{
              margin: 0,
              fontWeight: '600',
              opacity: 0.85,
              fontSize: '0.9em',
              marginBottom: '6px',
            }}
          >
            {teamMemberName}
          </p>
          <ul
            style={{
              listStyleType: 'none',
              paddingLeft: 0,
              margin: 0,
              fontSize: '0.9em',
            }}
          >
            {payload.map((entry, index) => {
              const statusKey = entry.dataKey;
              if (!statusKey || !statusMeta[statusKey]) return null; // Should not happen with current setup

              const fontWeight = statusKey === 'blocked' ? 'bold' : '500';
              return (
                <li
                  key={`item-${index}-${entry.name}`}
                  style={{
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span
                    style={{
                      color: statusMeta[statusKey].color,
                      fontWeight: fontWeight,
                    }}
                  >
                    {entry.name}:
                  </span>
                  <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{entry.value}</span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    } else {
      // Original full view logic: label is date
      const dayData = sprintDataFull.find((d) => d.date === label);
      if (!dayData) return null;

      let totalDayToDo = 0;
      let totalDayInProgress = 0;
      let totalDayBlocked = 0;

      teamMembers.forEach((member) => {
        totalDayToDo += dayData[member.id]?.toDo || 0;
        totalDayInProgress += dayData[member.id]?.inProgress || 0;
        totalDayBlocked += dayData[member.id]?.blocked || 0;
      });

      return (
        <div style={commonStyle}>
          <p
            style={{
              margin: 0,
              fontWeight: '600',
              opacity: 0.85,
              fontSize: '0.9em',
              marginBottom: '6px',
            }}
          >
            {label}
          </p>
          <ul
            style={{
              listStyleType: 'none',
              paddingLeft: 0,
              margin: 0,
              fontSize: '0.9em',
            }}
          >
            <li
              style={{
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ color: statusMeta.toDo.color, fontWeight: '500' }}>
                {statusMeta.toDo.name}:
              </span>
              <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{totalDayToDo}</span>
            </li>
            <li
              style={{
                marginBottom: '4px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  color: statusMeta.inProgress.color,
                  fontWeight: '500',
                }}
              >
                {statusMeta.inProgress.name}:
              </span>
              <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{totalDayInProgress}</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: statusMeta.blocked.color, fontWeight: 'bold' }}>
                {statusMeta.blocked.name}:
              </span>
              <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{totalDayBlocked}</span>
            </li>
          </ul>
        </div>
      );
    }
  }
  return null;
};

const CustomAvatarXAxisTick = (props: { x: number; y: number; payload: { value: string } }) => {
  const { x, y, payload } = props;
  const teamMemberName = payload.value;
  const memberInfo = teamMembers.find((member) => member.name === teamMemberName);
  const [isHovered, setIsHovered] = useState(false); // State for hover effect

  const handleAvatarClick = () => {
    if (memberInfo) {
      const message = {
        type: 'tool',
        payload: {
          toolName: 'show_user_status',
          params: {
            id: memberInfo.id,
            name: memberInfo.name,
            avatarUrl: memberInfo.avatarUrl,
          },
        },
      };
      postMessageToParent(message);
    }
  };

  if (memberInfo && memberInfo.avatarUrl) {
    const baseAvatarSize = 24; // Diameter of the avatar
    const yPositionOffset = 8; // Determines vertical placement relative to Recharts y

    const scale = isHovered ? 1.15 : 1.0; // Scale factor for hover effect

    // Transform to:
    // 1. Translate to the intended center of the avatar (x, y + yPositionOffset).
    // 2. Apply scaling.
    // 3. Translate back by half of the base size, so the image (drawn at 0,0) is centered before scaling.
    const transformValue = `translate(${x}, ${y + yPositionOffset}) scale(${scale}) translate(${-baseAvatarSize / 2}, ${-baseAvatarSize / 2})`;

    return (
      <g
        transform={transformValue}
        onClick={handleAvatarClick}
        style={{ cursor: 'pointer', transition: 'transform 0.1s ease-out' }} // Added transition
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <image
          href={memberInfo.avatarUrl}
          x={0} // Image is drawn from the (0,0) of the transformed <g>
          y={0}
          height={baseAvatarSize} // Image base size is constant
          width={baseAvatarSize} // Image base size is constant
          clipPath="url(#clipCircle)" // Clip path is for a 24x24 image starting at 0,0
        />
        {isHovered && (
          <g>
            <rect
              x={baseAvatarSize + 8} // Position 8px to the right of the avatar (increased from 4px)
              y={(baseAvatarSize - 16) / 2} // Vertically center with the avatar
              width={70} // Width of the tooltip background (increased from 44px)
              height={16} // Height of the tooltip background
              rx={3} // Rounded corners for the background
              ry={3}
              fill="rgb(50, 50, 50)" // Solid dark background
            />
            <text
              x={baseAvatarSize + 8 + 70 / 2} // Horizontally center text in the rect (increased x offset and width)
              y={baseAvatarSize / 2} // Vertically center text with the avatar
              fill="#FFFFFF"
              fontSize="10px"
              textAnchor="middle"
              dominantBaseline="middle" // Ensure proper vertical alignment of text
              style={{ pointerEvents: 'none' }} // Ensure text doesn't interfere with mouse events on avatar
            >
              Show profile
            </text>
          </g>
        )}
      </g>
    );
  }
  // Fallback to text if no avatar
  return <div>name</div>;
};

// --- Graph Component ---
export function Graph() {
  const [zoomedDate, setZoomedDate] = useState<string | null>(null);

  const isZoomed = !!zoomedDate;

  const chartData = useMemo(() => {
    if (isZoomed && zoomedDate) {
      const dayEntry = sprintDataFull.find((d) => d.date === zoomedDate);
      if (!dayEntry) return [];
      return teamMembers.map((member) => ({
        teamMemberId: member.id,
        teamMemberName: member.name,
        toDo: dayEntry[member.id]?.toDo || 0,
        inProgress: dayEntry[member.id]?.inProgress || 0,
        blocked: dayEntry[member.id]?.blocked || 0,
        originalColor: member.color,
      })) as ProcessedChartItemZoomedView[];
    }
    return originalProcessedDataFullView;
  }, [isZoomed, zoomedDate]);

  const handleChartClick = (clickEventData?: { activeLabel?: string }) => {
    if (isZoomed || !clickEventData || !clickEventData.activeLabel) {
      return;
    }
    const clickedDate = clickEventData.activeLabel;
    setZoomedDate(clickedDate); // Directly set zoomedDate on single click
  };

  return (
    <div
      style={{
        fontFamily:
          "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif",
        backgroundColor: '#F8F9FA',
        boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
        margin: 'auto',
        position: 'relative',
      }}
    >
      <div style={{ width: '100%', height: 425 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={
              chartData as {
                date: string;
                toDo: number;
                inProgress: number;
                blocked: number;
              }[]
            }
            margin={{
              top: 5,
              right: isZoomed ? 20 : 5,
              left: isZoomed ? 5 : 10,
              bottom: isZoomed ? 25 : 20,
            }} // Increased bottom margin for zoomed view avatars
            onClick={isZoomed ? undefined : handleChartClick}
            barCategoryGap={isZoomed ? '25%' : '30%'}
            barGap={isZoomed ? 0 : 4}
          >
            <defs>
              {/* Gradients */}
              {teamMembers.map((member) => (
                <linearGradient
                  id={member.gradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                  key={member.gradientId}
                >
                  <stop offset="5%" stopColor={member.color} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={member.color} stopOpacity={0.6} />
                </linearGradient>
              ))}
              {/* ClipPath for Avatar */}
              <clipPath id="clipCircle">
                <circle r="12" cx="12" cy="12" /> {/* Radius is half of avatarSize */}
              </clipPath>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#E0E0E0" vertical={false} />
            <XAxis
              dataKey={isZoomed ? 'teamMemberName' : 'date'}
              stroke="#78909C"
              fontSize="11px"
              axisLine={false}
              tickLine={false}
              padding={{ left: 0, right: 0 }}
              interval={0}
              // @ts-expect-error - CustomAvatarXAxisTick is not typed correctly
              {...(isZoomed && { tick: <CustomAvatarXAxisTick />, dy: 10 })}
            />
            <YAxis
              stroke="#78909C"
              fontSize="11px"
              axisLine={false}
              tickLine={false}
              tickCount={5}
              width={35}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip isZoomedView={isZoomed} />}
              cursor={{ fill: 'rgba(176, 190, 197, 0.08)' }}
            />

            {isZoomed
              ? // Zoomed View: Bars are statuses, stacked, NOW COLORED by mapped team member GRADIENTS
                statusKeys.map((statusKey) => (
                  <Bar
                    key={statusKey}
                    dataKey={statusKey}
                    stackId="zoomedDayStack"
                    name={statusMeta[statusKey].name}
                    fill={`url(#${fullViewStatusToGradientMapping[statusKey]})`} // Use team member GRADIENTS
                    // @ts-expect-error - RoundedBar is not typed correctly
                    shape={<RoundedBar />}
                    barSize={50}
                  />
                ))
              : statusKeys.map((statusKey) => (
                  <Bar
                    key={statusKey}
                    dataKey={statusKey}
                    stackId="fullViewStack"
                    name={statusMeta[statusKey].name} // Name is status (e.g. "To Do") for tooltip payload if it were used
                    fill={`url(#${fullViewStatusToGradientMapping[statusKey]})`} // Color from team member gradients
                    // @ts-expect-error - RoundedBar is not typed correctly
                    shape={<RoundedBar />}
                  />
                ))}
            {isZoomed ? (
              <Legend
                payload={statusKeys.map((key, index) => ({
                  value: statusMeta[key].name,
                  type: 'square',
                  color: teamMembers[index % teamMembers.length].color, // Use team member colors in order
                }))}
                wrapperStyle={{
                  fontSize: '11px',
                  paddingTop: '10px',
                  paddingBottom: '0px',
                }}
              />
            ) : (
              <Legend // Legend for Full View (zoomed-out graph) - NOW WITH UPDATED COLORS
                payload={statusKeys.map((key, index) => ({
                  value: statusMeta[key].name,
                  type: 'square',
                  color: teamMembers[index % teamMembers.length].color, // Use team member colors in order
                }))}
                wrapperStyle={{
                  fontSize: '11px',
                  paddingTop: '10px',
                  paddingBottom: '0px',
                }}
                align="center"
                verticalAlign="bottom"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!isZoomed && (
        <p
          style={{
            textAlign: 'center',
            marginTop: '5px',
            fontSize: '10px',
            color: '#90A4AE',
          }}
        ></p>
      )}
    </div>
  );
}
