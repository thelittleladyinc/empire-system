# Empire System v1.5.0 - Section 5: The Spine

This is the starter codebase for Section 5: The Spine, the core orchestration layer of the Empire System. This codebase is designed to be deployed directly to the Render infrastructure you have already set up.

## What's Included:

- **Core Infrastructure**: Express server, PostgreSQL database connection, and Redis/Bull queue setup.
- **Node 101: Workflow Orchestrator**: The central conductor that manages all system workflows.
- **Node 105: System Health Monitor**: A cron job that continuously monitors system health.

## How to Deploy:

### Step 1: Push This Code to Your GitHub Repository

1. **Download this codebase** as a ZIP file.
2. **Unzip the file** on your computer.
3. **Open your terminal** or command prompt and navigate into the `empire-system-code` folder.
4. **Run the following commands** to push the code to the `empire-system` repository you created earlier:

```bash
# Make sure you are in the empire-system-code directory
cd /path/to/your/unzipped/folder/empire-system-code

# Initialize git (if you haven't already)
git init

# Add all files
git add .

# Make your first commit
git commit -m "Initial commit of Section 5: The Spine"

# Set the main branch
git branch -M main

# Add your GitHub repository as the remote origin
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/empire-system.git

# Push the code to GitHub
git push -u origin main
```

### Step 2: Render Will Automatically Deploy

Because your Render Web Service is already connected to this GitHub repository, Render will automatically detect this push and start deploying your application. You can watch the deployment progress in your Render dashboard under the "Events" tab for your `empire-system` service.

### Step 3: Verify the Deployment

Once the deployment is complete, you should see a "Live" status. You can then visit your Web Service URL (e.g., `https://empire-system.onrender.com`) and you should see a JSON response like this:

```json
{
  "status": "online",
  "system": "Empire System v1.5.0",
  "section": "Section 5: The Spine",
  "timestamp": "2025-11-29T..."
}
```

This confirms that your core infrastructure is running and your first two nodes are active.

## Next Steps:

With The Spine deployed, you can now begin building out the other sections of the Empire System, following the implementation roadmap. You will add new nodes as files in the `src/nodes` directory and update the `WorkflowOrchestrator` to include them in the execution plan.
