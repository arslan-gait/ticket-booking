class ActionSerializerMixin:
    serializer_action_classes = {}
    default_serializer_class = None

    def get_serializer_class(self):
        serializer_class = self.serializer_action_classes.get(self.action)
        if serializer_class is not None:
            return serializer_class

        if self.default_serializer_class is not None:
            return self.default_serializer_class

        return super().get_serializer_class()
