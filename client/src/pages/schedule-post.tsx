import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PostForm from "@/components/post-form";
import { Calendar } from "lucide-react";

export default function SchedulePost() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Calendar className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schedule Post</h1>
          <p className="text-gray-600">Create and schedule your social media content</p>
        </div>
      </div>

      {/* Post Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <PostForm />
        </CardContent>
      </Card>
    </div>
  );
}
