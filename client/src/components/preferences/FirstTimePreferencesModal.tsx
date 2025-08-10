import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Target, Building2 } from "lucide-react";
import { preferencesApi, filterOptionsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const preferencesSchema = z.object({
  ageGroups: z.array(z.string()).min(1, "Please select at least one age group"),
  industries: z.array(z.string()).min(1, "Please select at least one industry"),
  opportunityTypes: z
    .array(z.string())
    .min(1, "Please select at least one opportunity type"),
});

type PreferencesFormValues = z.infer<typeof preferencesSchema>;

interface FirstTimePreferencesModalProps {
  open: boolean;
  onComplete: () => void;
}

export function FirstTimePreferencesModal({
  open,
  onComplete,
}: FirstTimePreferencesModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);

  const form = useForm<PreferencesFormValues>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      ageGroups: [],
      industries: [],
      opportunityTypes: [],
    },
  });

  // Fetch filter options
  const { data: ageGroupOptions = [] } = useQuery({
    queryKey: ["/api/filter-options", "ageGroup"],
    queryFn: () => filterOptionsApi.getByCategory("ageGroup"),
  });

  const { data: industryOptions = [] } = useQuery({
    queryKey: ["/api/filter-options", "industry"],
    queryFn: () => filterOptionsApi.getByCategory("industry"),
  });

  const { data: opportunityTypeOptions = [] } = useQuery({
    queryKey: ["/api/filter-options", "opportunityType"],
    queryFn: () => filterOptionsApi.getByCategory("opportunityType"),
  });

  const setPreferencesMutation = useMutation({
    mutationFn: preferencesApi.set,
    onSuccess: () => {
      toast({
        title: "Preferences saved!",
        description:
          "Your preferences have been set successfully. You can update them anytime in settings.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/student-preferences"] });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PreferencesFormValues) => {
    setPreferencesMutation.mutate(values);
  };

  const steps = [
    {
      title: "Age Groups",
      description: "Which age groups are you interested in?",
      field: "ageGroups" as const,
      options: ageGroupOptions,
      icon: Target,
    },
    {
      title: "Industries",
      description: "Select industries that interest you",
      field: "industries" as const,
      options: industryOptions,
      icon: Building2,
    },
    {
      title: "Opportunity Types",
      description: "What types of opportunities are you looking for?",
      field: "opportunityTypes" as const,
      options: opportunityTypeOptions,
      icon: Sparkles,
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const selectedValues = form.watch(currentStepData.field);

  const handleNext = () => {
    const currentFieldValue = form.getValues(currentStepData.field);
    if (currentFieldValue.length === 0) {
      form.setError(currentStepData.field, {
        message: `Please select at least one ${currentStepData.title.toLowerCase()}`,
      });
      return;
    }

    if (isLastStep) {
      form.handleSubmit(onSubmit)();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Welcome! Let's personalize your experience
          </DialogTitle>
          <DialogDescription>
            Help us show you the most relevant opportunities by setting your
            preferences. Step {currentStep + 1} of {steps.length}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-2 rounded-full ${
                index <= currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <currentStepData.icon className="h-5 w-5" />
                  {currentStepData.title}
                </CardTitle>
                <CardDescription>{currentStepData.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name={currentStepData.field}
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-2 gap-3">
                        {currentStepData.options.map((option: any) => (
                          <FormField
                            key={option.id}
                            control={form.control}
                            name={currentStepData.field}
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={option.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(
                                        option.value,
                                      )}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([
                                              ...field.value,
                                              option.value,
                                            ])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) =>
                                                  value !== option.value,
                                              ),
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    {option.label || option.value}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedValues.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Selected:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedValues.map((value) => (
                        <Badge key={value} variant="secondary">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={setPreferencesMutation.isPending}
              >
                {setPreferencesMutation.isPending
                  ? "Saving..."
                  : isLastStep
                    ? "Complete Setup"
                    : "Next"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
