## Pixie API

### Pixie helps you create interactive mini-apps for your product

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon/service role key

### Optional
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)

### LLM Configuration (Optional - for chat functionality)
- `LLM_PROVIDER` - LLM provider to use: `openai` or `claude` (default: `openai`)
  - **IMPORTANT**: Set this to `claude` if you want to use Claude instead of OpenAI
- `OPENAI_API_KEY` - Your OpenAI API key (required if using OpenAI)
- `OPENAI_MODEL` - OpenAI model to use (default: `gpt-4o`)
- `ANTHROPIC_API_KEY` - Your Anthropic API key (required if using Claude)
  - **Note**: Environment variable name must be exactly `ANTHROPIC_API_KEY` (case-insensitive)
- `CLAUDE_MODEL` - Claude model to use (default: `claude-3-5-sonnet-20240620`)
  - Available models: `claude-3-5-sonnet-20240620`, `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`, `claude-3-5-haiku-20241022`

### Example .env file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_key

# LLM Configuration (defaults to OpenAI)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o

# Uncomment below to use Claude instead
# LLM_PROVIDER=claude
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
# CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

## Installation

1. Install dependencies:
```bash
pip install -e .
```

2. Set up your `.env` file with the required variables (see above)

3. Run the application:
```bash
uvicorn app.main:app --reload
```